import { LegalDocPage } from './LegalDocPage';
import { cookiePolicy } from './legalContent';

export default function CookiePolicyPage() {
  return <LegalDocPage build={cookiePolicy} />;
}
