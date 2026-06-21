function resolveJwtSecret() {
  const secret = (process.env.JWT_SECRET || '').trim();
  if (!secret || secret.length < 32) {
    throw new Error('JWT_SECRET must be set and at least 32 characters');
  }
  if (secret === 'secret' || secret === 'your_super_secret_jwt_key_change_in_production') {
    throw new Error('JWT_SECRET must not use the default placeholder value');
  }
  return secret;
}

function assertSecurityEnv() {
  resolveJwtSecret();
  const internal = (process.env.INTERNAL_API_SECRET || '').trim();
  if (internal.length < 16) {
    throw new Error('INTERNAL_API_SECRET must be set and at least 16 characters');
  }
}

module.exports = { resolveJwtSecret, assertSecurityEnv };
