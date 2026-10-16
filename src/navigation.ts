import type { AssessmentKind } from './db';

export type MoreStack = {
  MoreHome: undefined;
  Checkups: undefined;
  TakeCheckup: { kind: AssessmentKind };
  Export: undefined;
  Settings: undefined;
};
