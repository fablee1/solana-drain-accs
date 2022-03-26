import { web3, Wallet } from "@project-serum/anchor"
import { SystemProgram } from "@solana/web3.js"

const transferAllSol = async (
  wallet: Wallet,
  to: string,
  connection: web3.Connection
) => {
  const balance = await connection.getBalance(wallet.publicKey)

  if (balance === 0) {
    console.log("No sol to drain.")
    return
  }

  const destPublicKey = new web3.PublicKey(to)

  const transactionTest = new web3.Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: destPublicKey,
      lamports: balance,
    })
  )
  transactionTest.recentBlockhash = (await connection.getRecentBlockhash()).blockhash
  transactionTest.feePayer = wallet.publicKey

  const fee = (
    await connection.getFeeForMessage(transactionTest.compileMessage(), "confirmed")
  ).value

  if (fee >= balance) {
    console.log("Balance is lower than fee")
    return
  }

  const transaction = new web3.Transaction().add(
    SystemProgram.transfer({
      fromPubkey: wallet.publicKey,
      toPubkey: destPublicKey,
      lamports: balance - fee,
    })
  )

  const signature = await web3.sendAndConfirmTransaction(connection, transaction, [
    wallet.payer,
  ])

  return signature
}

export default transferAllSol
