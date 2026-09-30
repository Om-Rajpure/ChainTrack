/**
 * Translates smart contract custom revert errors and RPC errors into friendly UI messages.
 */
export function parseContractError(error: any): string {
  if (!error) return "An unexpected error occurred.";

  const errorMessage = error?.message || String(error);
  const errorData = error?.data || error?.error?.data || "";

  // Custom errors from SupplyChain.sol
  if (errorMessage.includes("NotAdmin") || errorData.includes("NotAdmin")) {
    return "Action rejected: Only the contract administrator can perform this action.";
  }
  if (errorMessage.includes("NotParticipant") || errorData.includes("NotParticipant")) {
    return "Action rejected: Your wallet is not registered as a participant in the supply chain.";
  }
  if (errorMessage.includes("ParticipantInactive") || errorData.includes("ParticipantInactive")) {
    return "Action rejected: Your participant account is currently deactivated by the administrator.";
  }
  if (errorMessage.includes("WrongRole") || errorData.includes("WrongRole")) {
    return "Action rejected: Your participant role does not have permission for this operation.";
  }
  if (errorMessage.includes("NotOwner") || errorData.includes("NotOwner")) {
    return "Action rejected: Only the current product custodian/owner can perform this operation.";
  }
  if (errorMessage.includes("NotPendingReceiver") || errorData.includes("NotPendingReceiver")) {
    return "Action rejected: Only the designated pending receiver can accept or reject this transfer.";
  }
  if (errorMessage.includes("InvalidStatus") || errorData.includes("InvalidStatus")) {
    return "Action rejected: The product is not in the required status for this lifecycle transition.";
  }
  if (errorMessage.includes("InvalidReceiver") || errorData.includes("InvalidReceiver")) {
    return "Action rejected: The recipient wallet must be an active registered participant with an eligible role.";
  }
  if (errorMessage.includes("EmptyHash") || errorData.includes("EmptyHash")) {
    return "Action rejected: Product data hash cannot be empty (bytes32(0)).";
  }
  if (errorMessage.includes("DuplicateHash") || errorData.includes("DuplicateHash")) {
    return "Action rejected: A product with this exact data hash has already been registered on-chain.";
  }
  if (errorMessage.includes("StringTooLong") || errorData.includes("StringTooLong")) {
    return "Action rejected: Location exceeds 100 bytes or note/reason exceeds 280 bytes limit.";
  }
  if (errorMessage.includes("ProductNotFound") || errorData.includes("ProductNotFound")) {
    return "Product not found on the blockchain.";
  }

  // MetaMask user rejection
  if (error?.code === 4001 || errorMessage.includes("user rejected action") || errorMessage.includes("User rejected")) {
    return "Transaction was cancelled in your wallet.";
  }

  return error?.reason || error?.shortMessage || errorMessage.slice(0, 150);
}
