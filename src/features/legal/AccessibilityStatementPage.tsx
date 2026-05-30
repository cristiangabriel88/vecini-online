import { LegalDocPage } from './LegalDocPage';
import { accessibilityStatement } from './accessibilityContent';

export default function AccessibilityStatementPage() {
  return <LegalDocPage build={accessibilityStatement} />;
}
