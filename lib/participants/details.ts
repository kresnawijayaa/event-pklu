import { z } from "zod";

const optionalDetail = z.string().max(120).nullable().optional();

export const participantDetailsSchema = {
  registrationMode: optionalDetail,
  category: optionalDetail,
  mupel: optionalDetail,
  participantType: optionalDetail,
  registrationChannel: optionalDetail,
};

export type ParticipantDetailsInput = {
  registrationMode?: string | null;
  category?: string | null;
  mupel?: string | null;
  participantType?: string | null;
  registrationChannel?: string | null;
};
