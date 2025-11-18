export type TenantBrand = {
  companyName: string;
  platformName: string;
  displayName: string;
};

const PLATFORM_NAME = 'Teseo X';

const safeParseUser = (): any => {
  try {
    return JSON.parse(localStorage.getItem('user') || '{}');
  } catch {
    return {};
  }
};

export const getTenantBrand = (): TenantBrand => {
  const user = safeParseUser();
  const companyName = (user?.company_name || '').trim();
  const displayName = companyName || PLATFORM_NAME;

  return {
    companyName: companyName || PLATFORM_NAME,
    platformName: PLATFORM_NAME,
    displayName,
  };
};
