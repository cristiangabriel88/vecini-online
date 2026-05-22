import { LegalDocPage } from './LegalDocPage';
import { privacyPolicy } from './legalContent';

export default function PrivacyPolicyPage() {
  return <LegalDocPage build={privacyPolicy} />;
}
