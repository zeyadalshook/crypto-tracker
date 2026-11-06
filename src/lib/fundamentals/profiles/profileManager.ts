import { sha256Sync } from '../../../utils/sha256';
import defaultProtocolJson from './defaultProtocol.json';
import { ProtocolDefinition } from '../types';

export function calculateProfileHash(profile: any): string {
  const content = JSON.stringify(profile);
  return sha256Sync(content);
}

export const DEFAULT_PROTOCOL_HASH = calculateProfileHash(defaultProtocolJson);

export function getDefaultProtocol(): ProtocolDefinition {
  return {
    profileId: defaultProtocolJson.profileId,
    profileNameAr: defaultProtocolJson.profileNameAr,
    profileNameEn: defaultProtocolJson.profileNameEn,
    version: defaultProtocolJson.version,
    sha256Hash: DEFAULT_PROTOCOL_HASH,
    targetSector: defaultProtocolJson.targetSector,
    categories: defaultProtocolJson.categories.map((c) => ({
      id: c.id as any,
      titleAr: c.titleAr,
      weight: c.weight,
    })),
    passScoreThreshold: defaultProtocolJson.passScoreThreshold,
    minCoverageThreshold: defaultProtocolJson.minCoverageThreshold,
    disclaimerAr: defaultProtocolJson.disclaimerAr,
  };
}

export function isAssetInProfileSector(sector: string): boolean {
  if (!sector) return false;
  const s = sector.toLowerCase().trim();
  const feeSectors = [
    'defi',
    'dexes',
    'lending',
    'derivatives',
    'yield',
    'layer 1',
    'layer 2',
    'l1',
    'l2',
    'liquid staking',
    'fee_generating',
    'bridge',
    'cdp',
    'synthetics',
    'rwa',
  ];
  return feeSectors.some((fs) => s.includes(fs));
}
