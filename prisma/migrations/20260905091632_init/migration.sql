-- CreateEnum
CREATE TYPE "UserRole" AS ENUM ('USER', 'ORGANIZATION', 'ADMIN');

-- CreateEnum
CREATE TYPE "OrganizationType" AS ENUM ('GOVERNMENT', 'NGO', 'ACADEMIC_INSTITUTION', 'STARTUP', 'MSME', 'CORPORATE', 'RESEARCH_ORGANIZATION', 'OTHER');

-- CreateEnum
CREATE TYPE "Domain" AS ENUM ('EDUCATION', 'HEALTHCARE', 'AGRICULTURE', 'WATER_RESOURCES', 'ENVIRONMENT', 'ENERGY', 'URBAN_DEVELOPMENT', 'ACCESSIBILITY', 'PUBLIC_ADMINISTRATION', 'RURAL_LIVELIHOODS');

-- CreateEnum
CREATE TYPE "ChallengeStatus" AS ENUM ('SUBMITTED', 'PROCESSING', 'ASSIGNED', 'IN_PROGRESS', 'COMPLETED', 'DUPLICATE', 'NEEDS_REASSIGNMENT', 'FAILED');

-- CreateEnum
CREATE TYPE "Priority" AS ENUM ('LOW', 'MEDIUM', 'HIGH', 'CRITICAL');

-- CreateEnum
CREATE TYPE "MediaType" AS ENUM ('IMAGE', 'AUDIO');

-- CreateEnum
CREATE TYPE "AssignmentStatus" AS ENUM ('PENDING', 'ACCEPTED', 'REJECTED');

-- CreateEnum
CREATE TYPE "AssignmentSource" AS ENUM ('AUTOMATIC', 'ADMIN');

-- CreateEnum
CREATE TYPE "ProjectStatus" AS ENUM ('NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED');

-- CreateEnum
CREATE TYPE "MilestoneStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED');

-- CreateEnum
CREATE TYPE "NotificationType" AS ENUM ('CHALLENGE_SUBMITTED', 'CHALLENGE_ASSIGNED', 'CHALLENGE_ACCEPTED', 'CHALLENGE_REJECTED', 'PROJECT_STARTED', 'PROJECT_COMPLETED');

-- CreateTable
CREATE TABLE "User" (
    "id" TEXT NOT NULL,
    "clerkId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "role" "UserRole" NOT NULL DEFAULT 'USER',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Organization" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "type" "OrganizationType" NOT NULL,
    "domains" "Domain"[],
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "website" TEXT,
    "isVerified" BOOLEAN NOT NULL DEFAULT false,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Organization_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Challenge" (
    "id" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "status" "ChallengeStatus" NOT NULL DEFAULT 'SUBMITTED',
    "userId" TEXT NOT NULL,
    "mlCategory" TEXT,
    "category" "Domain",
    "priority" "Priority",
    "priorityScore" DOUBLE PRECISION,
    "extractedProblems" TEXT[],
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "similarChallenges" TEXT[],
    "similarityScore" DOUBLE PRECISION,
    "mlExplanation" TEXT,
    "unifiedText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Challenge_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "ChallengeMedia" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "publicId" TEXT NOT NULL,
    "mediaType" "MediaType" NOT NULL,
    "originalName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "ChallengeMedia_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "OrganizationAssignment" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "status" "AssignmentStatus" NOT NULL DEFAULT 'PENDING',
    "source" "AssignmentSource" NOT NULL DEFAULT 'AUTOMATIC',
    "remarks" TEXT,
    "assignedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "respondedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "OrganizationAssignment_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Project" (
    "id" TEXT NOT NULL,
    "challengeId" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "ProjectStatus" NOT NULL DEFAULT 'NOT_STARTED',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Project_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Milestone" (
    "id" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT,
    "status" "MilestoneStatus" NOT NULL DEFAULT 'PENDING',
    "dueDate" TIMESTAMP(3),
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Milestone_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Notification" (
    "id" TEXT NOT NULL,
    "userId" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "message" TEXT NOT NULL,
    "type" "NotificationType" NOT NULL,
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Notification_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "User_clerkId_key" ON "User"("clerkId");

-- CreateIndex
CREATE UNIQUE INDEX "User_email_key" ON "User"("email");

-- CreateIndex
CREATE UNIQUE INDEX "Organization_userId_key" ON "Organization"("userId");

-- CreateIndex
CREATE INDEX "Challenge_userId_idx" ON "Challenge"("userId");

-- CreateIndex
CREATE INDEX "Challenge_status_idx" ON "Challenge"("status");

-- CreateIndex
CREATE INDEX "Challenge_category_idx" ON "Challenge"("category");

-- CreateIndex
CREATE UNIQUE INDEX "ChallengeMedia_publicId_key" ON "ChallengeMedia"("publicId");

-- CreateIndex
CREATE INDEX "OrganizationAssignment_challengeId_idx" ON "OrganizationAssignment"("challengeId");

-- CreateIndex
CREATE INDEX "OrganizationAssignment_organizationId_idx" ON "OrganizationAssignment"("organizationId");

-- CreateIndex
CREATE INDEX "OrganizationAssignment_status_idx" ON "OrganizationAssignment"("status");

-- CreateIndex
CREATE INDEX "OrganizationAssignment_challengeId_status_idx" ON "OrganizationAssignment"("challengeId", "status");

-- CreateIndex
CREATE UNIQUE INDEX "Project_challengeId_key" ON "Project"("challengeId");

-- AddForeignKey
ALTER TABLE "Organization" ADD CONSTRAINT "Organization_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Challenge" ADD CONSTRAINT "Challenge_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "ChallengeMedia" ADD CONSTRAINT "ChallengeMedia_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAssignment" ADD CONSTRAINT "OrganizationAssignment_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "OrganizationAssignment" ADD CONSTRAINT "OrganizationAssignment_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_challengeId_fkey" FOREIGN KEY ("challengeId") REFERENCES "Challenge"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Project" ADD CONSTRAINT "Project_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "Organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Milestone" ADD CONSTRAINT "Milestone_projectId_fkey" FOREIGN KEY ("projectId") REFERENCES "Project"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Notification" ADD CONSTRAINT "Notification_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
