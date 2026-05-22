import { LegalDocPage } from './LegalDocPage';
import { termsOfService } from './legalContent';

export default function TermsPage() {
  return <LegalDocPage build={termsOfService} />;
}
