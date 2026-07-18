import {
  getSiteUrl,
  SITE_DESCRIPTION,
  SITE_NAME,
  SITE_TAGLINE,
} from "@/app/lib/site";
import { serializeJsonLd } from "@/app/lib/json-ld";

export function JsonLd() {
  const base = getSiteUrl();

  const organization = {
    "@context": "https://schema.org",
    "@type": "Organization",
    "@id": `${base}/#organization`,
    name: SITE_NAME,
    url: base,
    logo: `${base}/icon`,
    description: SITE_DESCRIPTION,
    sameAs: [] as string[],
  };

  const website = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    "@id": `${base}/#website`,
    name: SITE_NAME,
    alternateName: SITE_TAGLINE,
    url: base,
    description: SITE_DESCRIPTION,
    inLanguage: "id-ID",
    publisher: { "@id": `${base}/#organization` },
  };

  const software = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: SITE_NAME,
    applicationCategory: "DeveloperApplication",
    operatingSystem: "Web",
    url: base,
    description: SITE_DESCRIPTION,
    keywords: "API model murah, DeepSeek API, token AI murah, OpenAI compatible",
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(organization) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(website) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: serializeJsonLd(software) }}
      />
    </>
  );
}
