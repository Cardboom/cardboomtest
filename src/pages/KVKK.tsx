import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { legalTranslations } from "@/translations/legal";

const KVKK = () => {
  // KVKK is always in Turkish as it's Turkish law
  const legal = legalTranslations.en.legal;
  const t = legalTranslations.tr.legal.kvkk;

  return (
    <>
      <Helmet>
        <title>{t.title} | CardBoom</title>
        <meta name="description" content={t.metaDescription} />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-foreground">
                {t.title}
              </CardTitle>
              <p className="text-muted-foreground">Son Güncelleme: 13 Ocak 2026</p>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section1Title}</h2>
                <p className="text-muted-foreground mb-4">{t.section1Text}</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li><strong>Veri Sorumlusu:</strong> {legal.companyName}</li>
                  <li><strong>{t.mersisNo}:</strong> {legal.mersis}</li>
                  <li><strong>{t.taxIdLabel}:</strong> {legal.taxId}</li>
                  <li><strong>Adres:</strong> {legal.address}</li>
                  <li><strong>E-posta:</strong> {legal.kvkkEmail}</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section2Title}</h2>
                <p className="text-muted-foreground mb-2">{t.section2Text}</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section2Items.map((item, i) => (
                    <li key={i}><strong>{item.name}:</strong> {item.desc}</li>
                  ))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section3Title}</h2>
                <p className="text-muted-foreground mb-2">{t.section3Text}</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section3Items.map((item, i) => (<li key={i}>{item}</li>))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section4Title}</h2>
                <p className="text-muted-foreground">{t.section4Text}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section5Title}</h2>
                <p className="text-muted-foreground">{t.section5Text}</p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section6Title}</h2>
                <p className="text-muted-foreground mb-2">{t.section6Text}</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  {t.section6Items.map((item, i) => (<li key={i}>{item}</li>))}
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section7Title}</h2>
                <p className="text-muted-foreground">
                  {t.section7Text} <strong>{legal.kvkkEmail}</strong> {t.section7Text2}
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">{t.section8Title}</h2>
                <p className="text-muted-foreground">{t.section8Text}</p>
              </section>
            </CardContent>
          </Card>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default KVKK;
