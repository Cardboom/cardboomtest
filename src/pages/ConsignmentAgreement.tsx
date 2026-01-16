import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";
import { FileText, Shield, Briefcase, Scale, CreditCard, Building2, XCircle, Gavel, CheckCircle } from "lucide-react";

const ConsignmentAgreement = () => {
  const { locale } = useLanguage();
  
  const content = locale === 'tr' ? {
    title: "Konsinye ve Acentelik Sözleşmesi",
    subtitle: "(Kullanıcı → Brainbaby / CardBoom)",
    metaDescription: "CardBoom platformu için Konsinye ve Acentelik Sözleşmesi. Brainbaby Bilişim A.Ş. ve kullanıcı arasındaki ticari acentelik anlaşması.",
    intro: "Bu Konsinye ve Acentelik Sözleşmesi (\"Sözleşme\"), kullanıcı kaydı sırasında elektronik olarak şu taraflar arasında akdedilmiştir:",
    company: "Brainbaby Bilişim Anonim Şirketi",
    companyRef: "(\"Brainbaby\" veya \"Şirket\")",
    user: "Kayıt olan kullanıcı",
    userRef: "(\"Kullanıcı\" veya \"Konsinye Eden\")",
    sections: [
      {
        title: "1. Amaç",
        icon: FileText,
        content: "Kullanıcı, CardBoom platformu aracılığıyla sahip olduğu koleksiyon ticaret kartlarını pazarlamak ve satmak üzere Brainbaby'yi ticari acente ve konsinye alıcı olarak tayin eder."
      },
      {
        title: "2. Mülkiyet",
        icon: Shield,
        content: [
          "Konsinye edilen kartların yasal mülkiyeti satılana kadar Kullanıcı'da kalır.",
          "Brainbaby, bu Sözleşme kapsamında kartların mülkiyetini edinmez.",
          "Brainbaby, satış amaçlı olarak kendi adına ancak Kullanıcı hesabına hareket etme yetkisine sahiptir."
        ]
      },
      {
        title: "3. Konsinye ve Saklama",
        icon: Briefcase,
        content: "Kullanıcı, Brainbaby'ye aşağıdaki hakları verir:",
        items: [
          "kartları teslim alma, depolama, kasada saklama, derecelendirme, fotoğraflama ve sergileme",
          "kartları CardBoom'da satışa listeleme"
        ],
        footer: "Fiziksel saklama Brainbaby veya lojistik ortaklarına devredilebilir."
      },
      {
        title: "4. Satış Yetkisi",
        icon: Scale,
        content: "Brainbaby aşağıdaki konularda yetkilidir:",
        items: [
          "listeleme formatları ve pazar yeri kurallarını belirleme",
          "kartı konsinye alıcı olarak Brainbaby tarafından satılmış şeklinde sunma",
          "alıcılarla satış işlemlerini tamamlama"
        ],
        footer: "Brainbaby, kartları Kullanıcı'nın belirlediği fiyattan veya anlaşılan parametreler dahilinde satabilir."
      },
      {
        title: "5. Gelirler ve Ödeme",
        icon: CreditCard,
        content: [
          "Satış gelirleri, anlaşılan komisyonlar ve ücretler düşüldükten sonra Kullanıcı'ya aittir.",
          "Brainbaby bir ödeme kuruluşu veya kullanıcı fonlarının saklanması işlevi görmez.",
          "Kullanıcı'ya yapılacak ödemeler, uygulanabilir olduğu durumlarda lisanslı ödeme hizmet sağlayıcıları veya bankalar tarafından doğrudan gerçekleştirilir.",
          "Brainbaby, komisyon kesintisi için gereken miktarın ötesinde Kullanıcı fonlarını tutmaz veya saklamaz."
        ]
      },
      {
        title: "6. Komisyon",
        icon: Building2,
        content: [
          "Brainbaby, tamamlanan her satış için komisyon almaya hak kazanır.",
          "Komisyon oranları ve geçerli ücretler platformda görüntülenir ve Kullanıcı tarafından kabul edilir."
        ]
      },
      {
        title: "7. Risk ve Sigorta",
        icon: Shield,
        content: [
          "Brainbaby, konsinye edilen kartlara makul özeni gösterir.",
          "Risk dağılımı, sigorta kapsamı ve sorumluluk limitleri platform politikalarına tabidir."
        ]
      },
      {
        title: "8. Uyumluluk",
        icon: CheckCircle,
        content: [
          "Bu Sözleşme ortaklık, iş ortaklığı veya istihdam ilişkisi oluşturmaz.",
          "Bu Sözleşme'deki hiçbir şey, Brainbaby'nin ödeme hizmetleri, elektronik para hizmetleri veya bankacılık hizmetleri sağladığı şeklinde yorumlanamaz."
        ]
      },
      {
        title: "9. Fesih",
        icon: XCircle,
        content: [
          "Kullanıcı, platform prosedürleri ve ücretlerine tabi olarak satılmamış kartları geri çekebilir.",
          "Brainbaby, uyumluluk, dolandırıcılık önleme veya yasal nedenlerle listeleri askıya alabilir."
        ]
      },
      {
        title: "10. Yürürlükteki Hukuk",
        icon: Gavel,
        content: "Bu Sözleşme, Türkiye Cumhuriyeti kanunlarına tabidir."
      },
      {
        title: "11. Kabul",
        icon: CheckCircle,
        content: "Hesap oluşturarak, Kullanıcı bu Konsinye ve Acentelik Sözleşmesi'ni okuduğunu, anladığını ve kabul ettiğini onaylar."
      }
    ],
    lastUpdated: "Son güncelleme: Ocak 2025"
  } : {
    title: "Consignment & Agency Agreement",
    subtitle: "(User → Brainbaby / CardBoom)",
    metaDescription: "Consignment and Agency Agreement for the CardBoom platform. Commercial agency agreement between Brainbaby Bilişim A.Ş. and the user.",
    intro: "This Consignment and Agency Agreement (\"Agreement\") is entered into electronically upon user registration between:",
    company: "Brainbaby Bilişim Anonim Şirketi",
    companyRef: "(\"Brainbaby\" or \"Company\")",
    user: "The registering user",
    userRef: "(\"User\" or \"Consignor\")",
    sections: [
      {
        title: "1. Purpose",
        icon: FileText,
        content: "The User appoints Brainbaby as a commercial agent and consignee to market and sell collectible trading cards owned by the User through the CardBoom platform."
      },
      {
        title: "2. Ownership",
        icon: Shield,
        content: [
          "Legal ownership of the consigned cards remains with the User until sold.",
          "Brainbaby does not acquire ownership of the cards by virtue of this Agreement.",
          "Brainbaby is authorized to act in its own name but on the User's behalf for sale purposes."
        ]
      },
      {
        title: "3. Consignment & Custody",
        icon: Briefcase,
        content: "The User grants Brainbaby the right to:",
        items: [
          "receive, store, vault, grade, photograph, and display cards",
          "list cards for sale on CardBoom"
        ],
        footer: "Physical custody may be transferred to Brainbaby or its logistics partners."
      },
      {
        title: "4. Authority to Sell",
        icon: Scale,
        content: "Brainbaby is authorized to:",
        items: [
          "set listing formats and marketplace rules",
          "present the card as sold by Brainbaby as consignee",
          "complete sales transactions with buyers"
        ],
        footer: "Brainbaby may sell cards at the User-defined price or within agreed parameters."
      },
      {
        title: "5. Proceeds & Payment",
        icon: CreditCard,
        content: [
          "Sale proceeds belong to the User, minus agreed commissions and fees.",
          "Brainbaby does not act as a payment institution or custodian of user funds.",
          "Payments to the User shall be executed directly by licensed payment service providers or banks, where applicable.",
          "Brainbaby shall not hold or store User funds beyond what is required for commission deduction."
        ]
      },
      {
        title: "6. Commission",
        icon: Building2,
        content: [
          "Brainbaby is entitled to a commission for each completed sale.",
          "Commission rates and applicable fees are displayed on the platform and accepted by the User."
        ]
      },
      {
        title: "7. Risk & Insurance",
        icon: Shield,
        content: [
          "Brainbaby shall take reasonable care of consigned cards.",
          "Risk allocation, insurance coverage, and liability limits are governed by platform policies."
        ]
      },
      {
        title: "8. Compliance",
        icon: CheckCircle,
        content: [
          "This Agreement does not create a partnership, joint venture, or employment relationship.",
          "Nothing in this Agreement shall be interpreted as Brainbaby providing payment services, electronic money services, or banking services."
        ]
      },
      {
        title: "9. Termination",
        icon: XCircle,
        content: [
          "The User may withdraw unsold cards subject to platform procedures and fees.",
          "Brainbaby may suspend listings for compliance, fraud prevention, or legal reasons."
        ]
      },
      {
        title: "10. Governing Law",
        icon: Gavel,
        content: "This Agreement is governed by the laws of the Republic of Türkiye."
      },
      {
        title: "11. Acceptance",
        icon: CheckCircle,
        content: "By creating an account, the User confirms that they have read, understood, and accepted this Consignment and Agency Agreement."
      }
    ],
    lastUpdated: "Last updated: January 2025"
  };

  return (
    <>
      <Helmet>
        <title>{content.title} | CardBoom</title>
        <meta name="description" content={content.metaDescription} />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader className="text-center">
              <CardTitle className="text-3xl font-bold text-foreground">
                {content.title}
              </CardTitle>
              <p className="text-lg text-primary font-medium mt-2">{content.subtitle}</p>
              <p className="text-muted-foreground text-sm mt-4">{content.lastUpdated}</p>
            </CardHeader>
            <CardContent className="space-y-8">
              {/* Introduction */}
              <div className="bg-secondary/30 rounded-lg p-6 border border-border/30">
                <p className="text-muted-foreground mb-4">{content.intro}</p>
                <div className="space-y-4 ml-4">
                  <div>
                    <p className="text-foreground font-semibold">{content.company}</p>
                    <p className="text-muted-foreground text-sm">{content.companyRef}</p>
                  </div>
                  <p className="text-muted-foreground">and</p>
                  <div>
                    <p className="text-foreground font-semibold">{content.user}</p>
                    <p className="text-muted-foreground text-sm">{content.userRef}</p>
                  </div>
                </div>
              </div>

              {/* Sections */}
              {content.sections.map((section, index) => {
                const IconComponent = section.icon;
                return (
                  <section key={index} className="border-b border-border/30 pb-6 last:border-0">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <IconComponent className="w-5 h-5 text-primary" />
                      </div>
                      <h2 className="text-xl font-semibold text-foreground">{section.title}</h2>
                    </div>
                    <div className="ml-11">
                      {Array.isArray(section.content) ? (
                        <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                          {section.content.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-muted-foreground">{section.content}</p>
                      )}
                      {section.items && (
                        <ul className="list-disc pl-6 text-muted-foreground space-y-1 mt-2">
                          {section.items.map((item, i) => (
                            <li key={i}>{item}</li>
                          ))}
                        </ul>
                      )}
                      {section.footer && (
                        <p className="text-muted-foreground mt-2">{section.footer}</p>
                      )}
                    </div>
                  </section>
                );
              })}

              {/* Company Details */}
              <div className="bg-primary/5 rounded-lg p-6 border border-primary/20 mt-8">
                <h3 className="font-semibold text-foreground mb-2">Brainbaby Bilişim Anonim Şirketi</h3>
                <p className="text-sm text-muted-foreground">MERSIS: 0187173385800001</p>
                <p className="text-sm text-muted-foreground">Tax ID: 1871733858</p>
                <p className="text-sm text-muted-foreground">Ankara, Türkiye</p>
              </div>
            </CardContent>
          </Card>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default ConsignmentAgreement;
