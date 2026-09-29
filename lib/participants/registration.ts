export const VIP_PREFIX = "VIP-";

export function registrationCode(prefix: string, padding: number, sequence: number, isVip: boolean) {
  return `${isVip ? VIP_PREFIX : prefix}${String(sequence).padStart(padding, "0")}`;
}
