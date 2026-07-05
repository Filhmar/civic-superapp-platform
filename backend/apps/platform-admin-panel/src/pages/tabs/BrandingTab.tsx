import type { ConfigResponse } from '../../lib/types';
import BrandingEditor from '../../components/BrandingEditor';

interface Props {
  tenantId: string;
  cfg: ConfigResponse;
  refetch: () => Promise<ConfigResponse>;
}

export default function BrandingTab({ tenantId, cfg, refetch }: Props) {
  return <BrandingEditor tenantId={tenantId} cfg={cfg} refetch={refetch} />;
}
