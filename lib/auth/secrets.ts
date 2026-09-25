function requireSecret(name: "AUTH_PEPPER" | "IP_HASH_SECRET") {
  const value = process.env[name];

  if (!value || Buffer.byteLength(value, "utf8") < 32) {
    throw new Error(`${name} harus diatur dengan nilai acak minimal 32 byte.`);
  }

  return value;
}

export function getAuthPepper() {
  return requireSecret("AUTH_PEPPER");
}

export function getIpHashSecret() {
  const pepper = getAuthPepper();
  const ipHashSecret = requireSecret("IP_HASH_SECRET");

  if (pepper === ipHashSecret) {
    throw new Error("AUTH_PEPPER dan IP_HASH_SECRET harus berbeda.");
  }

  return ipHashSecret;
}
