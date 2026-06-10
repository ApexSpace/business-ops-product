-- Capability Suite v2: global registry features + capability assignments (many-to-many)

CREATE TABLE "registry_features" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL,
    "moduleKey" TEXT NOT NULL,
    "moduleName" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "permissionKey" TEXT,
    "routeKeys" JSONB,
    "icon" TEXT,
    "defaultEnabled" BOOLEAN NOT NULL DEFAULT false,
    "status" "CapabilityFeatureStatus" NOT NULL DEFAULT 'ACTIVE',
    "source" "CapabilityFeatureSource" NOT NULL DEFAULT 'CODE',
    "isBillable" BOOLEAN NOT NULL DEFAULT false,
    "limitKey" TEXT,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "registry_features_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "capability_feature_assignments" (
    "id" TEXT NOT NULL,
    "capabilityId" TEXT NOT NULL,
    "featureKey" TEXT NOT NULL,
    "status" "CapabilityFeatureStatus" NOT NULL DEFAULT 'ACTIVE',
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    "metadata" JSONB,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "capability_feature_assignments_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "registry_features_key_key" ON "registry_features"("key");
CREATE INDEX "registry_features_moduleKey_idx" ON "registry_features"("moduleKey");
CREATE INDEX "registry_features_status_idx" ON "registry_features"("status");
CREATE INDEX "registry_features_source_idx" ON "registry_features"("source");

CREATE UNIQUE INDEX "capability_feature_assignments_capabilityId_featureKey_key" ON "capability_feature_assignments"("capabilityId", "featureKey");
CREATE INDEX "capability_feature_assignments_capabilityId_idx" ON "capability_feature_assignments"("capabilityId");
CREATE INDEX "capability_feature_assignments_featureKey_idx" ON "capability_feature_assignments"("featureKey");

ALTER TABLE "capability_feature_assignments" ADD CONSTRAINT "capability_feature_assignments_capabilityId_fkey" FOREIGN KEY ("capabilityId") REFERENCES "capabilities"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "capability_feature_assignments" ADD CONSTRAINT "capability_feature_assignments_featureKey_fkey" FOREIGN KEY ("featureKey") REFERENCES "registry_features"("key") ON DELETE RESTRICT ON UPDATE CASCADE;

-- Migrate legacy capability_features into registry + assignments (key remap where applicable)
INSERT INTO "registry_features" (
    "id", "key", "moduleKey", "moduleName", "name", "description",
    "permissionKey", "defaultEnabled", "status", "source", "isBillable", "limitKey",
    "metadata", "deletedAt", "createdAt", "updatedAt"
)
SELECT DISTINCT ON (mapped_key)
    gen_random_uuid()::text,
    mapped_key,
    COALESCE(
        CASE
            WHEN mapped_key LIKE 'contacts.%' OR mapped_key IN ('pipelines.view', 'leads.view', 'work_items.view') THEN 'crm'
            WHEN mapped_key LIKE 'whatsapp.%' THEN 'whatsapp'
            WHEN mapped_key LIKE 'email.%' THEN 'email'
            WHEN mapped_key LIKE 'ai.%' THEN 'ai'
            WHEN mapped_key LIKE 'calendar.%' THEN 'calendar'
            WHEN mapped_key LIKE 'payments.%' THEN 'payments'
            WHEN mapped_key LIKE 'forms.%' THEN 'forms'
            WHEN mapped_key LIKE 'automation.%' THEN 'automation'
            ELSE split_part(mapped_key, '.', 1)
        END,
        'general'
    ),
    COALESCE(
        CASE
            WHEN mapped_key LIKE 'contacts.%' OR mapped_key IN ('pipelines.view', 'leads.view', 'work_items.view') THEN 'CRM'
            WHEN mapped_key LIKE 'whatsapp.%' THEN 'WhatsApp'
            WHEN mapped_key LIKE 'email.%' THEN 'Email Marketing'
            WHEN mapped_key LIKE 'ai.%' THEN 'AI Agents'
            WHEN mapped_key LIKE 'calendar.%' THEN 'Calendar'
            WHEN mapped_key LIKE 'payments.%' THEN 'Payments'
            WHEN mapped_key LIKE 'forms.%' THEN 'Forms'
            WHEN mapped_key LIKE 'automation.%' THEN 'Automation'
            ELSE initcap(split_part(mapped_key, '.', 1))
        END,
        'General'
    ),
    cf."name",
    cf."description",
    cf."permissionKey",
    cf."defaultEnabled",
    cf."status",
    cf."source",
    cf."isBillable",
    cf."limitKey",
    cf."metadata",
    cf."deletedAt",
    cf."createdAt",
    cf."updatedAt"
FROM (
    SELECT
        cf.*,
        CASE cf."key"
            WHEN 'crm.contacts' THEN 'contacts.view'
            WHEN 'crm.pipelines' THEN 'pipelines.view'
            WHEN 'crm.leads' THEN 'leads.view'
            WHEN 'crm.work_items' THEN 'work_items.view'
            WHEN 'whatsapp.campaigns' THEN 'whatsapp.campaigns.view'
            WHEN 'whatsapp.templates' THEN 'whatsapp.templates.view'
            WHEN 'whatsapp.broadcasts' THEN 'whatsapp.broadcasts.view'
            WHEN 'email.campaigns' THEN 'email.campaigns.view'
            WHEN 'email.templates' THEN 'email.templates.view'
            WHEN 'email.automations' THEN 'email.automations.view'
            WHEN 'ai.chatbots' THEN 'ai.chatbots.view'
            WHEN 'ai.assistant' THEN 'ai.assistant.view'
            WHEN 'calendar.appointments' THEN 'calendar.appointments.view'
            WHEN 'calendar.calendars' THEN 'calendar.calendars.view'
            WHEN 'payments.invoices' THEN 'payments.invoices.view'
            WHEN 'payments.checkout' THEN 'payments.checkout.view'
            WHEN 'forms.builder' THEN 'forms.builder.view'
            WHEN 'forms.submissions' THEN 'forms.submissions.view'
            WHEN 'automation.workflows' THEN 'automation.workflows.view'
            WHEN 'automation.triggers' THEN 'automation.triggers.view'
            ELSE cf."key"
        END AS mapped_key
    FROM "capability_features" cf
    WHERE cf."deletedAt" IS NULL
) cf
ORDER BY mapped_key, cf."createdAt" ASC
ON CONFLICT ("key") DO NOTHING;

INSERT INTO "capability_feature_assignments" (
    "id", "capabilityId", "featureKey", "status", "sortOrder", "metadata",
    "deletedAt", "createdAt", "updatedAt"
)
SELECT
    gen_random_uuid()::text,
    cf."capabilityId",
    CASE cf."key"
        WHEN 'crm.contacts' THEN 'contacts.view'
        WHEN 'crm.pipelines' THEN 'pipelines.view'
        WHEN 'crm.leads' THEN 'leads.view'
        WHEN 'crm.work_items' THEN 'work_items.view'
        WHEN 'whatsapp.campaigns' THEN 'whatsapp.campaigns.view'
        WHEN 'whatsapp.templates' THEN 'whatsapp.templates.view'
        WHEN 'whatsapp.broadcasts' THEN 'whatsapp.broadcasts.view'
        WHEN 'email.campaigns' THEN 'email.campaigns.view'
        WHEN 'email.templates' THEN 'email.templates.view'
        WHEN 'email.automations' THEN 'email.automations.view'
        WHEN 'ai.chatbots' THEN 'ai.chatbots.view'
        WHEN 'ai.assistant' THEN 'ai.assistant.view'
        WHEN 'calendar.appointments' THEN 'calendar.appointments.view'
        WHEN 'calendar.calendars' THEN 'calendar.calendars.view'
        WHEN 'payments.invoices' THEN 'payments.invoices.view'
        WHEN 'payments.checkout' THEN 'payments.checkout.view'
        WHEN 'forms.builder' THEN 'forms.builder.view'
        WHEN 'forms.submissions' THEN 'forms.submissions.view'
        WHEN 'automation.workflows' THEN 'automation.workflows.view'
        WHEN 'automation.triggers' THEN 'automation.triggers.view'
        ELSE cf."key"
    END,
    cf."status",
    0,
    cf."metadata",
    cf."deletedAt",
    cf."createdAt",
    cf."updatedAt"
FROM "capability_features" cf
WHERE cf."deletedAt" IS NULL
  AND EXISTS (
    SELECT 1 FROM "registry_features" rf
    WHERE rf."key" = CASE cf."key"
        WHEN 'crm.contacts' THEN 'contacts.view'
        WHEN 'crm.pipelines' THEN 'pipelines.view'
        WHEN 'crm.leads' THEN 'leads.view'
        WHEN 'crm.work_items' THEN 'work_items.view'
        WHEN 'whatsapp.campaigns' THEN 'whatsapp.campaigns.view'
        WHEN 'whatsapp.templates' THEN 'whatsapp.templates.view'
        WHEN 'whatsapp.broadcasts' THEN 'whatsapp.broadcasts.view'
        WHEN 'email.campaigns' THEN 'email.campaigns.view'
        WHEN 'email.templates' THEN 'email.templates.view'
        WHEN 'email.automations' THEN 'email.automations.view'
        WHEN 'ai.chatbots' THEN 'ai.chatbots.view'
        WHEN 'ai.assistant' THEN 'ai.assistant.view'
        WHEN 'calendar.appointments' THEN 'calendar.appointments.view'
        WHEN 'calendar.calendars' THEN 'calendar.calendars.view'
        WHEN 'payments.invoices' THEN 'payments.invoices.view'
        WHEN 'payments.checkout' THEN 'payments.checkout.view'
        WHEN 'forms.builder' THEN 'forms.builder.view'
        WHEN 'forms.submissions' THEN 'forms.submissions.view'
        WHEN 'automation.workflows' THEN 'automation.workflows.view'
        WHEN 'automation.triggers' THEN 'automation.triggers.view'
        ELSE cf."key"
    END
  )
ON CONFLICT ("capabilityId", "featureKey") DO NOTHING;
