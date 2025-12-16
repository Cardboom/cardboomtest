import { Helmet } from "react-helmet-async";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

const DistanceSalesContract = () => {

  return (
    <>
      <Helmet>
        <title>Mesafeli Satış Sözleşmesi | CardBoom</title>
        <meta name="description" content="CardBoom Mesafeli Satış Sözleşmesi - 6502 sayılı Tüketicinin Korunması Hakkında Kanun kapsamında mesafeli satış koşulları." />
      </Helmet>
      
      <div className="min-h-screen bg-background">
        <Header cartCount={0} onCartClick={() => {}} />
        
        <main className="container mx-auto px-4 py-12 max-w-4xl">
          <Card className="bg-card/50 backdrop-blur-sm border-border/50">
            <CardHeader>
              <CardTitle className="text-3xl font-bold text-foreground">
                Mesafeli Satış Sözleşmesi
              </CardTitle>
              <p className="text-muted-foreground">Son Güncelleme: 16 Aralık 2024</p>
            </CardHeader>
            <CardContent className="prose prose-invert max-w-none space-y-6">
              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">MADDE 1 - TARAFLAR</h2>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">1.1 SATICI BİLGİLERİ</h3>
                <ul className="list-none text-muted-foreground space-y-1">
                  <li><strong>Ünvan:</strong> CardBoom Teknoloji A.Ş.</li>
                  <li><strong>Adres:</strong> İstanbul, Türkiye</li>
                  <li><strong>E-posta:</strong> destek@cardboom.com</li>
                  <li><strong>Telefon:</strong> +90 (212) XXX XX XX</li>
                </ul>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">1.2 ALICI BİLGİLERİ</h3>
                <p className="text-muted-foreground">
                  Alıcı bilgileri, sipariş sırasında Alıcı tarafından Platform'a girilen bilgilerdir.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">MADDE 2 - KONU</h2>
                <p className="text-muted-foreground">
                  İşbu Sözleşme'nin konusu, Alıcı'nın Satıcı'ya ait internet sitesinden elektronik ortamda siparişini verdiği aşağıda nitelikleri ve satış fiyatı belirtilen ürünün satışı ve teslimi ile ilgili olarak 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmelere Dair Yönetmelik hükümleri gereğince tarafların hak ve yükümlülüklerinin belirlenmesidir.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">MADDE 3 - SÖZLEŞME KONUSU ÜRÜN</h2>
                <p className="text-muted-foreground mb-2">
                  Sözleşme konusu ürün/hizmetin temel nitelikleri, satış fiyatı ve ödeme şekli ile teslimat bilgileri Platform'da yer almaktadır. Platform üzerinden satışa sunulan ürünler:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Koleksiyonluk kartlar (Pokemon, Yu-Gi-Oh!, One Piece, Lorcana vb.)</li>
                  <li>Spor kartları (NBA, NFL vb.)</li>
                  <li>Koleksiyonluk figürler ve sanat eserleri</li>
                  <li>Dijital oyun hizmetleri</li>
                  <li>Kart payları (hisseli sahiplik)</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">MADDE 4 - GENEL HÜKÜMLER</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Alıcı, Platform'da gösterilen ürünlerin temel nitelikleri, satış fiyatı ve ödeme şekli ile teslimata ilişkin ön bilgileri okuyup bilgi sahibi olduğunu ve elektronik ortamda gerekli onayı verdiğini kabul eder.</li>
                  <li>Ürün, Alıcı'nın sipariş formunda belirttiği adrese teslim edilecektir.</li>
                  <li>Sözleşme konusu ürün, yasal 30 günlük süreyi aşmamak koşulu ile her bir ürün için Alıcı'nın belirttiği adrese en kısa sürede teslim edilir.</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">MADDE 5 - TESLİMAT</h2>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.1 Teslimat Seçenekleri</h3>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li><strong>Kargo ile Teslimat:</strong> Ürün, anlaşmalı kargo şirketi aracılığıyla Alıcı'nın adresine gönderilir.</li>
                  <li><strong>Vault (Kasa) Teslimati:</strong> Ürün, CardBoom kasasında güvenle saklanır ve talep edildiğinde gönderilir.</li>
                  <li><strong>Takas:</strong> Kullanıcılar arası takas işlemlerinde ürünler Platform aracılığıyla değiştirilir.</li>
                </ul>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">5.2 Teslimat Süresi</h3>
                <p className="text-muted-foreground">
                  Ürünler, sipariş onayından itibaren en geç 30 (otuz) gün içinde teslim edilir. Kargo ile yapılan teslimatlar ortalama 3-7 iş günü sürmektedir.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">MADDE 6 - CAYMA HAKKI</h2>
                <p className="text-muted-foreground mb-2">
                  Alıcı, sözleşme konusu ürünün kendisine veya gösterdiği adresteki kişiye/kuruluşa tesliminden itibaren 14 (ondört) gün içinde cayma hakkını kullanabilir. Cayma hakkının kullanılması için:
                </p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Bu süre içinde Satıcı'ya yazılı bildirimde bulunulması</li>
                  <li>Ürünün kullanılmamış, ambalajının açılmamış ve hasar görmemiş olması</li>
                  <li>Orijinal faturasının iade edilmesi</li>
                </ul>
                <h3 className="text-lg font-medium text-foreground mt-4 mb-2">6.1 Cayma Hakkının İstisnaları</h3>
                <p className="text-muted-foreground mb-2">Aşağıdaki durumlarda cayma hakkı kullanılamaz:</p>
                <ul className="list-disc pl-6 text-muted-foreground space-y-1">
                  <li>Tüketicinin istekleri veya kişisel ihtiyaçları doğrultusunda hazırlanan ürünler</li>
                  <li>Çabuk bozulabilen veya son kullanma tarihi geçebilecek ürünler</li>
                  <li>Dijital içerik satışları (Valorant VP, PUBG UC vb.)</li>
                  <li>Kart payları/hisseli sahiplik işlemleri</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">MADDE 7 - ÖDEME VE İADE</h2>
                <ul className="list-disc pl-6 text-muted-foreground space-y-2">
                  <li>Ürün bedeli, kredi kartı, banka kartı, havale/EFT veya Platform Cüzdanı ile ödenebilir.</li>
                  <li>Cayma hakkı kullanıldığında, ürün bedeli 14 gün içinde Alıcı'ya iade edilir.</li>
                  <li>Kredi kartı ile yapılan ödemelerde iade, ilgili banka prosedürlerine göre gerçekleştirilir.</li>
                  <li>Kargo ücreti, iade durumunda Alıcı'ya aittir (hatalı veya kusurlu ürün hariç).</li>
                </ul>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">MADDE 8 - GARANTİ</h2>
                <p className="text-muted-foreground">
                  Platform üzerinden satılan ürünler, özgünlük garantisi kapsamındadır. Sahte veya taklit olduğu tespit edilen ürünler için tam iade yapılır. Derecelendirilmiş kartlar (PSA, BGS, CGC) için orijinallik garantisi geçerlidir.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">MADDE 9 - YETKİLİ MAHKEME</h2>
                <p className="text-muted-foreground">
                  İşbu sözleşmeden doğabilecek uyuşmazlıklarda Gümrük ve Ticaret Bakanlığı'nca ilan edilen değere kadar Tüketici Hakem Heyetleri, bu değeri aşan durumlarda Tüketici Mahkemeleri yetkilidir. 
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">MADDE 10 - YÜRÜRLÜK</h2>
                <p className="text-muted-foreground">
                  Alıcı, siparişini onaylaması ile işbu Sözleşme'nin tüm koşullarını kabul etmiş sayılır. Satıcı, siparişin gerçekleşmesi öncesinde işbu Sözleşme'nin sitede Alıcı tarafından okunup kabul edildiğine dair elektronik onay alır.
                </p>
              </section>

              <section>
                <h2 className="text-xl font-semibold text-foreground mb-3">MADDE 11 - İLETİŞİM</h2>
                <p className="text-muted-foreground">
                  Tüm soru, öneri ve şikayetleriniz için <strong>destek@cardboom.com</strong> adresine e-posta gönderebilir veya Platform içi destek sistemini kullanabilirsiniz.
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

export default DistanceSalesContract;