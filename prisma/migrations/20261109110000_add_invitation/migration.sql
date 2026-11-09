CREATE TABLE "invitation" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "tenant_id" UUID NOT NULL,
    "invited_by_user_id" UUID NOT NULL,
    "email" VARCHAR(255) NOT NULL,
    "role_id" UUID NOT NULL,
    "token_hash" VARCHAR(64) NOT NULL,
    "expires_at" TIMESTAMPTZ NOT NULL,
    "accepted_at" TIMESTAMPTZ,
    "revoked_at" TIMESTAMPTZ,
    "created_at" TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "invitation_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "invitation_token_hash_key" ON "invitation"("token_hash");
CREATE INDEX "invitation_tenant_id_email_idx" ON "invitation"("tenant_id", "email");

ALTER TABLE "invitation"
    ADD CONSTRAINT "invitation_tenant_id_fkey"
    FOREIGN KEY ("tenant_id") REFERENCES "tenant"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invitation"
    ADD CONSTRAINT "invitation_invited_by_user_id_fkey"
    FOREIGN KEY ("invited_by_user_id") REFERENCES "user"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "invitation"
    ADD CONSTRAINT "invitation_role_id_fkey"
    FOREIGN KEY ("role_id") REFERENCES "role"("id")
    ON DELETE RESTRICT ON UPDATE CASCADE;
