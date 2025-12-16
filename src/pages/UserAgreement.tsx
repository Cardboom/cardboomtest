import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const UserAgreement = () => {

  return (
    <>
      <Helmet>
        <title>Kullanıcı Sözleşmesi | CardBoom</title>
        <meta name="description" content="CardBoom Kullanıcı Sözleşmesi - Platform kullanım koşulları, hak ve yükümlülükler hakkında detaylı bilgi." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-foreground">
                Kullanıcı Sözleşmesi
              </CardTitle>
              <p className="text-muted-foreground">Son Güncelleme: 16 Aralık 2024</p>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Taraflar</h2>
                <p className="text-muted-foreground">
                  İşbu Kullanıcı Sözleşmesi ("Sözleşme"), CardBoom platformu ("Platform") ile Platform'a üye olan kullanıcı ("Kullanıcı") arasında, Platform'un kullanım şartlarını düzenlemek amacıyla akdedilmiştir.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. Tanımlar</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li><strong>Platform:</strong> CardBoom web sitesi ve mobil uygulamaları</li>
                  <li><strong>Kullanıcı:</strong> Platform'a kayıt olarak hizmetlerden yararlanan gerçek veya tüzel kişiler</li>
                  <li><strong>Satıcı:</strong> Platform üzerinden ürün satan kullanıcılar</li>
                  <li><strong>Alıcı:</strong> Platform üzerinden ürün satın alan kullanıcılar</li>
                  <li><strong>Cüzdan:</strong> Kullanıcıların Platform içi bakiyelerini yönettikleri sistem</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Üyelik Koşulları</h2>
                <p className="text-muted-foreground mb-2">Platform'a üye olmak için:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>18 yaşını doldurmuş olmak veya yasal vasi onayına sahip olmak</li>
                  <li>Geçerli bir e-posta adresi ve telefon numarasına sahip olmak</li>
                  <li>Doğru ve güncel kişisel bilgiler sağlamak</li>
                  <li>İşbu Sözleşme'yi kabul etmek</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Kullanıcı Hak ve Yükümlülükleri</h2>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">4.1 Haklar</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Platform hizmetlerinden yararlanma</li>
                  <li>Ürün alım-satımı yapma</li>
                  <li>Cüzdan sistemi kullanma</li>
                  <li>Müşteri desteğinden faydalanma</li>
                </ul>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">4.2 Yükümlülükler</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Doğru ve güncel bilgi sağlama</li>
                  <li>Hesap güvenliğini koruma</li>
                  <li>Yasal düzenlemelere uyma</li>
                  <li>Platform kurallarına uyma</li>
                  <li>Sahte veya çalıntı ürün satmama</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Alım-Satım Kuralları</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Satıcılar, ürünlerini doğru ve eksiksiz tanımlamakla yükümlüdür</li>
                  <li>Sahte, çalıntı veya yasal olmayan ürünlerin satışı yasaktır</li>
                  <li>Platform, şüpheli işlemleri durdurma ve hesapları askıya alma hakkını saklı tutar</li>
                  <li>İşlem ücretleri Platform tarafından belirlenir ve değiştirilebilir</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. Ödeme ve Cüzdan Sistemi</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Kullanıcılar, Cüzdan'a kredi kartı veya havale ile bakiye yükleyebilir</li>
                  <li>Satış gelirleri, işlem tamamlandıktan sonra Cüzdan'a aktarılır</li>
                  <li>Çekim işlemleri, kimlik doğrulaması sonrasında gerçekleştirilir</li>
                  <li>Platform, işlem ücretlerini satış tutarından düşer</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. Yasaklı Faaliyetler</h2>
                <p className="text-muted-foreground mb-2">Aşağıdaki faaliyetler kesinlikle yasaktır:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Sahte veya taklit ürün satışı</li>
                  <li>Kara para aklama faaliyetleri</li>
                  <li>Platform dışı iletişim ve ödeme teşviki</li>
                  <li>Birden fazla hesap açma</li>
                  <li>Fiyat manipülasyonu</li>
                  <li>Diğer kullanıcıları aldatma</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">8. Platform'un Hak ve Yükümlülükleri</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Güvenli bir işlem ortamı sağlama</li>
                  <li>Kullanıcı verilerini koruma</li>
                  <li>Müşteri desteği sunma</li>
                  <li>Anlaşmazlıklarda arabuluculuk yapma</li>
                  <li>Kural ihlallerinde hesap askıya alma/kapatma</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">9. Sorumluluk Sınırlaması</h2>
                <p className="text-muted-foreground">
                  Platform, kullanıcılar arası işlemlerde aracı konumundadır. Satışa sunulan ürünlerin kalitesi, özgünlüğü ve durumu konusunda doğrudan sorumluluk kabul etmez. Anlaşmazlıklarda arabuluculuk yapar ancak nihai karar yargı mercilerine aittir.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">10. Fikri Mülkiyet</h2>
                <p className="text-muted-foreground">
                  Platform'un logosu, tasarımı, yazılımı ve tüm içeriği CardBoom'un fikri mülkiyetidir. İzinsiz kullanımı yasaktır.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">11. Sözleşme Değişiklikleri</h2>
                <p className="text-muted-foreground">
                  Platform, işbu Sözleşme'yi önceden bildirimde bulunarak değiştirme hakkını saklı tutar. Değişiklikler, Platform'da yayınlandığı tarihte yürürlüğe girer.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">12. Uygulanacak Hukuk ve Yetkili Mahkeme</h2>
                <p className="text-muted-foreground">
                  İşbu Sözleşme Türkiye Cumhuriyeti kanunlarına tabidir. Uyuşmazlıklarda İstanbul Mahkemeleri ve İcra Daireleri yetkilidir.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">13. İletişim</h2>
                <p className="text-muted-foreground">
                  Sorularınız için <strong>destek@cardboom.com</strong> adresinden bize ulaşabilirsiniz.
                </p>
              </section>
            </CardContent>
          </Card>
        </main>
        
        <Footer />
      </div>
    </>
  );
};

export default UserAgreement;