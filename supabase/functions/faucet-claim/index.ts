import { ethers } from "https://esm.sh/ethers@6.13.1";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function decimals() view returns (uint8)",
];

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: CORS });
  }

  try {
    const { walletAddress } = await req.json();

    // Validate EVM address
    if (!walletAddress || !ethers.isAddress(walletAddress)) {
      return json({ error: "Invalid wallet address." }, 400);
    }

    const address = walletAddress.toLowerCase();

    // One-time claim check
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: existing } = await supabase
      .from("faucet_claims")
      .select("id, claimed_at")
      .eq("wallet_address", address)
      .maybeSingle();

    if (existing) {
      return json(
        { error: `Address already claimed on ${new Date(existing.claimed_at).toUTCString()}.` },
        429
      );
    }

    // Set up provider + vault wallet
    const provider = new ethers.JsonRpcProvider(Deno.env.get("SEPOLIA_RPC_URL")!);
    const vault    = new ethers.Wallet(Deno.env.get("VAULT_PRIVATE_KEY")!, provider);

    // Check vault has enough ETH
    const vaultBalance = await provider.getBalance(vault.address);
    const ethAmount    = ethers.parseEther("0.01");
    if (vaultBalance < ethAmount + ethers.parseEther("0.005")) {
      // 0.005 buffer for gas
      return json({ error: "Faucet vault is low on ETH. Contact the team." }, 503);
    }

    // -- Send 0.01 Sepolia ETH --
    const ethTx = await vault.sendTransaction({
      to: walletAddress,
      value: ethAmount,
      gasLimit: 21000n,
    });

    // -- Send 150 $EUN --
    const eunContract = new ethers.Contract(
      Deno.env.get("EUN_CONTRACT_ADDRESS")!,
      ERC20_ABI,
      vault
    );
    const decimals = await eunContract.decimals();
    const eunTx = await eunContract.transfer(
      walletAddress,
      ethers.parseUnits("150", decimals),
      { gasLimit: 100000n }
    );

    // Log the claim — store EUN tx hash as primary
    const { error: dbErr } = await supabase.from("faucet_claims").insert({
      wallet_address: address,
      chain:          "sepolia",
      amount:         150,
      tx_hash:        eunTx.hash,
      claimed_at:     new Date().toISOString(),
    });

    if (dbErr) {
      console.error("DB insert failed:", dbErr.message);
      // Claim went through on-chain — return success anyway, log the error
    }

    return json({
      success:    true,
      ethTxHash:  ethTx.hash,
      eunTxHash:  eunTx.hash,
      ethAmount:  "0.01",
      eunAmount:  "150",
    }, 200);

  } catch (err) {
    console.error("Faucet error:", err);
    return json({ error: err instanceof Error ? err.message : "Unexpected error." }, 500);
  }
});

function json(body: unknown, status: number) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, "Content-Type": "application/json" },
  });
}
