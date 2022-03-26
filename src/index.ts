import { Wallet, web3 } from "@project-serum/anchor"
import { Keypair, PublicKey } from "@solana/web3.js"
import transferSpl from "./transferSpl"
import transferAllSol from "./transferAllSol"
import * as bip39 from "bip39"
import * as ed from "ed25519-hd-key"
import { drainNumber, drainTo } from "./config"

const sleep = (ms: number) => {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

const connection = new web3.Connection(web3.clusterApiUrl("mainnet-beta"))

const generateKeypairs = (limit: number) => {
  const path = "m/44'/501'/"
  const mnemonic = process.env.SEED_PHRASE!

  const seed = bip39.mnemonicToSeedSync(mnemonic).toString("hex")

  const keypairs = []

  for (let x = 0; x < limit; x++) {
    const seed1 = Keypair.fromSeed(ed.derivePath(`${path}${x}'`, seed).key)
    const seed2 = Keypair.fromSeed(ed.derivePath(`${path}${x}'/0'`, seed).key)
    keypairs.push(seed1, seed2)
  }

  return keypairs
}

let drainedCount = 0

const getTokens = async (address: string) => {
  const tokens = await connection.getParsedTokenAccountsByOwner(new PublicKey(address), {
    programId: new PublicKey("TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"),
  })
  return tokens.value.map((token) => {
    const info = token.account.data.parsed.info
    return {
      mint: info.mint,
      amount: parseInt(info.tokenAmount.amount),
    }
  })
}

const drainAcc = async (wallet: Wallet) => {
  drainedCount++
  console.log(
    `------ Starting working on account ${wallet.publicKey.toString()}. ${drainedCount}/${
      drainNumber * 2
    } ------`
  )

  const tokens = await getTokens(wallet.publicKey.toBase58())
  let sent = 0
  for (let token of tokens) {
    if (token.amount > 0) {
      sent++
      console.log(`Sending tokens...`)
      await transferSpl(token.mint, wallet, drainTo, connection, token.amount)
    }
  }
  if (sent === 0) console.log(`No tokens to send from ${wallet.publicKey.toString()}`)

  console.log("Trying to drain sol...")
  await transferAllSol(wallet, drainTo, connection)

  console.log(
    `------ Finishing working on account ${wallet.publicKey.toString()}... ------`
  )
  await sleep(3000)
}

const main = async () => {
  const keypairs = generateKeypairs(drainNumber)
  for (let keypair of keypairs) {
    await drainAcc(new Wallet(keypair))
  }
}

main()
