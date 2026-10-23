-- AlterTable
ALTER TABLE "MessageTemplate" ADD COLUMN     "whatsappLanguage" TEXT NOT NULL DEFAULT 'pt_BR',
ADD COLUMN     "whatsappTemplateName" TEXT;
