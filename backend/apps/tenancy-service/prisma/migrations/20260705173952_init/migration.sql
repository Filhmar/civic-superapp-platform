-- CreateTable
CREATE TABLE "tenants" (
    "id" TEXT NOT NULL,
    "kind" TEXT NOT NULL,
    "parent_tenant_id" TEXT,
    "status" TEXT NOT NULL DEFAULT 'active',
    "bundle_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "ticket_prefix" TEXT NOT NULL,
    "resident_id_prefix" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "tenants_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "tenant_config_versions" (
    "id" SERIAL NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "config" JSONB NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_config_versions_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "tenants_bundle_id_key" ON "tenants"("bundle_id");

-- CreateIndex
CREATE INDEX "tenants_status_idx" ON "tenants"("status");

-- CreateIndex
CREATE INDEX "tenant_config_versions_tenant_id_idx" ON "tenant_config_versions"("tenant_id");

-- CreateIndex
CREATE UNIQUE INDEX "tenant_config_versions_tenant_id_version_key" ON "tenant_config_versions"("tenant_id", "version");

-- AddForeignKey
ALTER TABLE "tenant_config_versions" ADD CONSTRAINT "tenant_config_versions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
