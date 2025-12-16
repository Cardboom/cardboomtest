import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const KVKK = () => {

  return (
    <>
      <Helmet>
        <title>KVKK Aydınlatma Metni | CardBoom</title>
        <meta name="description" content="CardBoom KVKK Aydınlatma Metni - 6698 Sayılı Kişisel Verilerin Korunması Kanunu kapsamında kişisel verilerinizin işlenmesi hakkında bilgilendirme." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-foreground">
                KVKK Aydınlatma Metni
              </CardTitle>
              <p className="text-muted-foreground">Son Güncelleme: 16 Aralık 2024</p>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">1. Veri Sorumlusu</h2>
                <p className="text-muted-foreground">
                  6698 sayılı Kişisel Verilerin Korunması Kanunu ("KVKK") kapsamında, CardBoom olarak kişisel verilerinizi aşağıda açıklanan amaçlar doğrultusunda, hukuka ve dürüstlük kurallarına uygun şekilde işleyebilecek, kaydedebilecek, saklayabilecek, güncelleyebilecek, üçüncü kişilere açıklayabilecek ve aktarabileceğimizi bildiririz.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">2. İşlenen Kişisel Veriler</h2>
                <p className="text-muted-foreground mb-2">Platformumuz aracılığıyla aşağıdaki kişisel verileriniz işlenmektedir:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li><strong>Kimlik Bilgileri:</strong> Ad, soyad, T.C. kimlik numarası</li>
                  <li><strong>İletişim Bilgileri:</strong> E-posta adresi, telefon numarası, adres</li>
                  <li><strong>Finansal Bilgiler:</strong> IBAN, banka hesap bilgileri, ödeme bilgileri</li>
                  <li><strong>İşlem Güvenliği:</strong> IP adresi, cihaz bilgileri, çerez verileri</li>
                  <li><strong>Kullanıcı Bilgileri:</strong> Kullanıcı adı, profil fotoğrafı, işlem geçmişi</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">3. Kişisel Verilerin İşlenme Amaçları</h2>
                <p className="text-muted-foreground mb-2">Kişisel verileriniz aşağıdaki amaçlarla işlenmektedir:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Üyelik işlemlerinin gerçekleştirilmesi</li>
                  <li>Alım-satım işlemlerinin yürütülmesi</li>
                  <li>Ödeme ve para transferi işlemlerinin gerçekleştirilmesi</li>
                  <li>Müşteri hizmetleri ve destek sağlanması</li>
                  <li>Yasal yükümlülüklerin yerine getirilmesi</li>
                  <li>Dolandırıcılık ve güvenlik önlemlerinin alınması</li>
                  <li>Pazarlama ve iletişim faaliyetleri (onayınız dahilinde)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">4. Kişisel Verilerin Aktarılması</h2>
                <p className="text-muted-foreground">
                  Kişisel verileriniz, yukarıda belirtilen amaçların gerçekleştirilmesi için gerekli olduğu ölçüde; iş ortaklarımıza, tedarikçilerimize, ödeme hizmeti sağlayıcılarına, kargo şirketlerine ve yasal zorunluluk halinde yetkili kamu kurum ve kuruluşlarına aktarılabilecektir.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">5. Kişisel Verilerin Toplanma Yöntemi ve Hukuki Sebebi</h2>
                <p className="text-muted-foreground">
                  Kişisel verileriniz, web sitemiz, mobil uygulamalarımız ve fiziksel iletişim kanalları aracılığıyla otomatik veya otomatik olmayan yöntemlerle toplanmaktadır. Verileriniz KVKK'nın 5. ve 6. maddelerinde belirtilen hukuki sebeplere dayanılarak işlenmektedir.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">6. İlgili Kişinin Hakları (KVKK m.11)</h2>
                <p className="text-muted-foreground mb-2">KVKK'nın 11. maddesi uyarınca aşağıdaki haklara sahipsiniz:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                  <li>Kişisel verileriniz işlenmişse buna ilişkin bilgi talep etme</li>
                  <li>Kişisel verilerinizin işlenme amacını ve bunların amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                  <li>Yurt içinde veya yurt dışında kişisel verilerinizin aktarıldığı üçüncü kişileri bilme</li>
                  <li>Kişisel verilerinizin eksik veya yanlış işlenmiş olması hâlinde bunların düzeltilmesini isteme</li>
                  <li>KVKK'nın 7. maddesinde öngörülen şartlar çerçevesinde kişisel verilerinizin silinmesini veya yok edilmesini isteme</li>
                  <li>Düzeltme, silme veya yok etme işlemlerinin kişisel verilerinizin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
                  <li>İşlenen verilerin münhasıran otomatik sistemler vasıtasıyla analiz edilmesi suretiyle aleyhinize bir sonucun ortaya çıkmasına itiraz etme</li>
                  <li>Kişisel verilerinizin kanuna aykırı olarak işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">7. Başvuru Yöntemi</h2>
                <p className="text-muted-foreground">
                  Yukarıda belirtilen haklarınızı kullanmak için <strong>kvkk@cardboom.com</strong> adresine e-posta gönderebilir veya yazılı olarak şirket adresimize başvurabilirsiniz. Başvurularınız en geç 30 gün içinde sonuçlandırılacaktır.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">8. Veri Güvenliği</h2>
                <p className="text-muted-foreground">
                  Kişisel verilerinizin güvenliği için gerekli her türlü teknik ve idari tedbirler alınmaktadır. Verileriniz şifreli bağlantılar (SSL/TLS) üzerinden iletilmekte ve güvenli sunucularda saklanmaktadır.
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

export default KVKK;