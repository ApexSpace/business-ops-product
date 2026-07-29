-- CreateEnum
CREATE TYPE "AutomationWorkflowStatus" AS ENUM ('DRAFT', 'ACTIVE', 'INACTIVE');

-- CreateEnum
CREATE TYPE "AutomationWorkflowRunStatus" AS ENUM ('RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "AutomationWorkflowRunStepStatus" AS ENUM ('PENDING', 'RUNNING', 'WAITING', 'COMPLETED', 'FAILED', 'SKIPPED');

-- CreateTable
CREATE TABLE "automation_workflows" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "status" "AutomationWorkflowStatus" NOT NULL DEFAULT 'DRAFT',
    "triggerKey" TEXT NOT NULL,
    "triggerFilters" JSONB,
    "steps" JSONB NOT NULL,
    "settings" JSONB NOT NULL DEFAULT '{}',
    "isSystemTemplate" BOOLEAN NOT NULL DEFAULT false,
    "createdById" TEXT,
    "deletedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "automation_workflows_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_workflow_runs" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "workflowId" TEXT NOT NULL,
    "status" "AutomationWorkflowRunStatus" NOT NULL DEFAULT 'RUNNING',
    "triggerKey" TEXT NOT NULL,
    "subjectId" TEXT NOT NULL,
    "subjectType" TEXT NOT NULL,
    "contextEntityId" TEXT,
    "contextEntityType" TEXT,
    "contactId" TEXT,
    "currentStepIndex" INTEGER NOT NULL DEFAULT 0,
    "enrollmentReason" TEXT,
    "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "completedAt" TIMESTAMP(3),
    "failedAt" TIMESTAMP(3),
    "errorMessage" TEXT,
    "metadata" JSONB,

    CONSTRAINT "automation_workflow_runs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "automation_workflow_run_steps" (
    "id" TEXT NOT NULL,
    "businessId" TEXT NOT NULL,
    "runId" TEXT NOT NULL,
    "stepIndex" INTEGER NOT NULL,
    "actionKey" TEXT NOT NULL,
    "status" "AutomationWorkflowRunStepStatus" NOT NULL DEFAULT 'PENDING',
    "config" JSONB NOT NULL,
    "input" JSONB,
    "output" JSONB,
    "errorMessage" TEXT,
    "scheduledFor" TIMESTAMP(3),
    "startedAt" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),

    CONSTRAINT "automation_workflow_run_steps_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "automation_workflows_businessId_deletedAt_idx" ON "automation_workflows"("businessId", "deletedAt");

-- CreateIndex
CREATE INDEX "automation_workflows_businessId_status_idx" ON "automation_workflows"("businessId", "status");

-- CreateIndex
CREATE INDEX "automation_workflows_businessId_triggerKey_idx" ON "automation_workflows"("businessId", "triggerKey");

-- CreateIndex
CREATE INDEX "automation_workflow_runs_businessId_workflowId_idx" ON "automation_workflow_runs"("businessId", "workflowId");

-- CreateIndex
CREATE INDEX "automation_workflow_runs_businessId_contactId_idx" ON "automation_workflow_runs"("businessId", "contactId");

-- CreateIndex
CREATE INDEX "automation_workflow_runs_businessId_status_idx" ON "automation_workflow_runs"("businessId", "status");

-- CreateIndex
CREATE INDEX "automation_workflow_runs_workflowId_status_idx" ON "automation_workflow_runs"("workflowId", "status");

-- CreateIndex
CREATE INDEX "automation_workflow_run_steps_runId_idx" ON "automation_workflow_run_steps"("runId");

-- CreateIndex
CREATE INDEX "automation_workflow_run_steps_businessId_idx" ON "automation_workflow_run_steps"("businessId");

-- CreateIndex
CREATE UNIQUE INDEX "automation_workflow_run_steps_runId_stepIndex_key" ON "automation_workflow_run_steps"("runId", "stepIndex");

-- AddForeignKey
ALTER TABLE "automation_workflows" ADD CONSTRAINT "automation_workflows_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workflows" ADD CONSTRAINT "automation_workflows_createdById_fkey" FOREIGN KEY ("createdById") REFERENCES "users"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workflow_runs" ADD CONSTRAINT "automation_workflow_runs_businessId_fkey" FOREIGN KEY ("businessId") REFERENCES "businesses"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workflow_runs" ADD CONSTRAINT "automation_workflow_runs_workflowId_fkey" FOREIGN KEY ("workflowId") REFERENCES "automation_workflows"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "automation_workflow_run_steps" ADD CONSTRAINT "automation_workflow_run_steps_runId_fkey" FOREIGN KEY ("runId") REFERENCES "automation_workflow_runs"("id") ON DELETE CASCADE ON UPDATE CASCADE;
