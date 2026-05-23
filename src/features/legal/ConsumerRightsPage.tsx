import { LegalDocPage } from './LegalDocPage';
import { consumerRights } from './legalContent';

export default function ConsumerRightsPage() {
  return <LegalDocPage build={consumerRights} />;
}
