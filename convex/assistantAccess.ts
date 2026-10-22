// Separate assistant authorization from the legacy notification-owner identifier.
export async function assistantKeyMatches(presented: string, expected: string | undefined): Promise<boolean> {
  const valid = (key: string | undefined): key is string => typeof key === "string"
    && key.length >= 32 && key.length <= 256 && /^[\x21-\x7E]+$/.test(key);
  if (!valid(presented) || !valid(expected)) return false;
  const hash = async (value: string) => new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(value)));
  const [left, right] = await Promise.all([hash(presented), hash(expected)]);
  let difference = 0;
  for (let i = 0; i < left.length; i++) difference |= left[i] ^ right[i];
  return difference === 0;
}
