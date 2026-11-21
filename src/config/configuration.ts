export default () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  port: parseInt(process.env.PORT ?? '4000', 10),
  publicUrl: process.env.PUBLIC_URL ?? `http://localhost:${process.env.PORT ?? 4000}`,
  corsOrigins: (process.env.CORS_ORIGINS ?? 'http://localhost:3000')
    .split(',')
    .map((o) => o.trim())
    .filter(Boolean),
  database: {
    host: process.env.DB_HOST ?? 'localhost',
    port: parseInt(process.env.DB_PORT ?? '3306', 10),
    username: process.env.DB_USERNAME ?? 'carsale',
    password: process.env.DB_PASSWORD ?? 'carsale',
    name: process.env.DB_NAME ?? 'carsale',
    synchronize: process.env.DB_SYNCHRONIZE === 'true',
    logging: process.env.DB_LOGGING === 'true',
  },
  storage: {
    /** `local` (./uploads on this server) or `s3` (any S3-compatible service). */
    driver: (process.env.STORAGE_DRIVER ?? 'local').toLowerCase(),
    s3: {
      bucket: process.env.S3_BUCKET ?? '',
      region: process.env.S3_REGION || 'auto',
      endpoint: process.env.S3_ENDPOINT || undefined,
      accessKeyId: process.env.S3_ACCESS_KEY_ID || undefined,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY || undefined,
      forcePathStyle: process.env.S3_FORCE_PATH_STYLE === 'true',
      publicUrl: process.env.S3_PUBLIC_URL || undefined,
      acl: process.env.S3_ACL || undefined,
    },
  },
  jwt: {
    secret: process.env.JWT_SECRET,
    expiresIn: process.env.JWT_EXPIRES_IN ?? '1d',
  },
});
