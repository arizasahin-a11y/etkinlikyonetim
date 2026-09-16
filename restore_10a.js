
const { Pool } = require('pg');
const pool = new Pool({
    connectionString: 'postgresql://etkinlik_yonetim_user:91UV1rwf8iLDXrL6VNnVUznsRTwRDIOn@dpg-d66uplf5r7bs739g4hn0-a.oregon-postgres.render.com/etkinlik_yonetim',
    ssl: { rejectUnauthorized: false }
});

const rawData = [
    {
        "ogrenciNo": "2500",
        "adSoyad": "Çağla İrmak Kuyucu",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Derinlige, yogunluga, yercekimi ivmesine baglidir", "hipotez:”sivi icinde derinlik arttikca basinc artar.”", "hipotez:”sivi yogunlugu arttikca basinc artar.”"], "soruIndex": 0 },
            { "cevaplar": ["MALZEMELER\nSeffaf buyuk kap (fanus veya legen)\nBalon\nip\nsu\nyag\ncetvel\nagirlik (balon batmasi icin tas)\nKOSULLAR\nAyni sicaklik\nayni miktar sivi\nayni buyuklukte balonlar"], "soruIndex": 1 },
            { "cevaplar": ["Balonlarin buyuklugu esit olmali", "balonlar ayni miktar sisirilmeli", "derinlik olcumu dikkatli yapilmali", "sivi miktarlari esit ayarlanmali"], "soruIndex": 2 },
            { "cevaplar": ["balonlar esit miktarda sisirilir, ipler yardimiyla balonlar kabin farkli derinliklerine yerlestirilir (yuzeye yakin ve dibe yakin), balon sekilleri gozlemlenir, daha sonra balonlarin 1 tanesi yag 1 tanesi su ve esit derinlik olacak sekilde tekrarlanir"], "soruIndex": 3 },
            { "cevaplar": ["Su icinde olanlarda: en dipteki daha cok kuculur (derinlik arttikca basinc artar)", "yag ve su: sudaki daha kucuk olur (yogunluk arttikca basinc artar)"], "soruIndex": 4 },
            { "cevaplar": ["P=h•d•g"], "soruIndex": 5 },
            { "cevaplar": ["h artarsa P artar", "d artarsa P artar", "ayni derinlik ve yogunlukta basinc esit", "kap sekli onemli degil"], "soruIndex": 6 },
            { "cevaplar": ["Dalgiclar derine daldikca uzerlerindeki basinc artar", "Derinde cisimler sikisabilir", "Sise delinirse alttn daha uzaga ve hizli su cikar", "derine giden denizaltlari daha dayanikli yapilir"], "soruIndex": 7 },
            { "cevaplar": ["Deney sonucu hipotezi destekler.Derinlik arttiikca basincin attigi gozlemlenır.", "Deney sonucu hıpotezı destekler yogunluk arttıkca sıvı basıncı artar"], "soruIndex": 8 },
            { "cevaplar": ["Basınc olcer kullanılabılır", "Daha derın kap kullanılabılır", "farkı yoğunlukta sıvılar denenebılır", "balon yerıne baska maddeler kullanılabılır"], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2506",
        "adSoyad": "Yunus emre oruç",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvı basıncı sıvının yoğunluğuna bağlıdır.Yoğunluğu büyük olan sıvının basıncı büyüktür.Yoğunluğu büyük olan sıvıyı iletmek daha çok kuvvet ister."], "soruIndex": 0 },
            { "cevaplar": ["Enjektör,su,cıva,serum hortumu ve bant.Koşullar;özdeş enjektör,özdeş ortam,farklı sıvılar,aynı sıcaklık,aynı madde hacmi."], "soruIndex": 1 },
            { "cevaplar": ["Cıvanın insan vücuduyla temas etmemesine dikkat etmeliyiz (insan sağlığı için oldukça tehlikeli)ve suyla cıvanın temas etmediğinden (deneyin doğruluğu için) emin olmalıyız.Eldiven,önlük,gözlük gibi labarotuvar araç gereçlerini kullanmaya özen göstermeliyiz."], "soruIndex": 2 },
            { "cevaplar": ["Hacimleri eşit olmalıdır çünkü biz yoğunluğun sıvı basıncına olan etkisini gözlemlemek istiyoruz işin içine derinliği katmadan", "Ortam sıcaklığının aynı olması gerekmektedir ki maddenin o anki sıvı haline etki etmesin", "Enjektörleri yoğunluğun iletiminde nasıl rol oynadığını (iletimi zor mu kolay mı ne kadar güç uyguladık vs.) göstermek amacıyla kullandık", "Serum hortumlarını sıvıyı belirli bir düzlemde iletmek için kullandık", "Su ve cıvayı yoğunluğu farklı olan hacimleri eşit olan maddelerin basıncını araştırmak ve basıncı iletmek için kullandık", "Bantı ise mekanizmadaki parçaları sabit tutmak için kullandık"], "soruIndex": 3 },
            { "cevaplar": ["Suyun yoğunluğu cıvanın yoğunluğunun 1/13 katıdır.Bu yüzden suyu iletmek için çok büyük bir kuvvet uygulamayız (herkesin yapabileceği uygun bir kuvvet yeterlidir)Ancak su yerine cıva kullanılırsa çok devasa kuvvetler uygulamamız gerekir çünkü cıvanın yoğunluğu suyun yoğunluğunun 13 katıdır.Beklediğimiz sonuç ise suyla sıvaya kıyasla çok kolay iletim."], "soruIndex": 4 },
            { "cevaplar": ["Basınç (P)= derinlik (h) • yoğunluk (d). yer çekimi (g)"], "soruIndex": 5 },
            { "cevaplar": ["Durgun sıvılarda basınç yoğunluk ve derinliğin çarpımına bağlıdır."], "soruIndex": 6 },
            { "cevaplar": ["Hidrolik sistemler"], "soruIndex": 7 },
            { "cevaplar": ["Hipotezimiz doğrudur.Suyun iletimi cıvaya kıyasla çok daha az bir kuvvetle mümkündür."], "soruIndex": 8 },
            { "cevaplar": ["Deneyde ortaya çıkan basınç farkını daha net ölçmek adına basınç ölçer kullanılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2512",
        "adSoyad": "Yusuf Çevik ",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvı basıncı sıvının yoğunluğuna bağlıdır.Yoğunluğu büyük olan sıvının basıncı büyüktür.Yoğunluğu büyük olan sıvıyı iletmek daha çok kuvvet ister."], "soruIndex": 0 },
            { "cevaplar": ["Enjektör,su,cıva,serum hortumu ve bant.Koşullar;özdeş enjektör,özdeş ortam,farklı sıvılar,aynı sıcaklık,aynı madde hacmi."], "soruIndex": 1 },
            { "cevaplar": ["Cıvanın insan vücuduyla temas etmemesine dikkat etmeliyiz (insan sağlığı için oldukça tehlikeli)ve suyla cıvanın temas etmediğinden (deneyin doğruluğu için) emin olmalıyız.Eldiven,önlük,gözlük gibi labarotuvar araç gereçlerini kullanmaya özen göstermeliyiz."], "soruIndex": 2 },
            { "cevaplar": ["Hacimleri eşit olmalıdır çünkü biz yoğunluğun sıvı basıncına olan etkisini gözlemlemek istiyoruz işin içine derinliği katmadan", "Ortam sıcaklığının aynı olması gerekmektedir ki maddenin o anki sıvı haline etki etmesin", "Enjektörleri yoğunluğun iletiminde nasıl rol oynadığını (iletimi zor mu kolay mı ne kadar güç uyguladık vs.) göstermek amacıyla kullandık", "Serum hortumlarını sıvıyı belirli bir düzlemde iletmek için kullandık", "Su ve cıvayı yoğunluğu farklı olan hacimleri eşit olan maddelerin basıncını araştırmak ve basıncı iletmek için kullandık", "Bantı ise mekanizmadaki parçaları sabit tutmak için kullandık"], "soruIndex": 3 },
            { "cevaplar": ["Suyun yoğunluğu cıvanın yoğunluğunun 1/13 katıdır.Bu yüzden suyu iletmek için çok büyük bir kuvvet uygulamayız (herkesin yapabileceği uygun bir kuvvet yeterlidir)Ancak su yerine cıva kullanılırsa çok devasa kuvvetler uygulamamız gerekir çünkü cıvanın yoğunluğu suyun yoğunluğunun 13 katıdır.Beklediğimiz sonuç ise suyla sıvaya kıyasla çok kolay iletim."], "soruIndex": 4 },
            { "cevaplar": ["Basınç (P)= derinlik (h) • yoğunluk (d). yer çekimi (g)"], "soruIndex": 5 },
            { "cevaplar": ["Durgun sıvılarda basınç yoğunluk ve derinliğin çarpımına bağlıdır."], "soruIndex": 6 },
            { "cevaplar": ["Hidrolik sistemler"], "soruIndex": 7 },
            { "cevaplar": ["Hipotezimiz doğrudur.Suyun iletimi cıvaya kıyasla çok daha az bir kuvvetle mümkündür."], "soruIndex": 8 },
            { "cevaplar": ["Deneyde ortaya çıkan basınç farkını daha net ölçmek adına basınç ölçer kullanılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2520",
        "adSoyad": "Elif Öykü Çam",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvı basıncı derinliğe, yerçekimi ivmesine ve yoğunluğa bağlıdır."], "soruIndex": 0 },
            { "cevaplar": ["Yumurta, Özdeş Yağ Dolu Kap, Özdeş saf su dolu kap, 25 Derece oda sıcaklığı."], "soruIndex": 1 },
            { "cevaplar": ["Kapların eş hacimli olması, Yumurtaların özdeş olması, Deneyin deniz seviyesinde olması."], "soruIndex": 2 },
            { "cevaplar": ["Özdeş yağ ve saf su dolu kaplara yumurtalar batırılır, Yumurtalar sıvıda derine indirilir ve değişimler gözlenir."], "soruIndex": 3 },
            { "cevaplar": ["Saf su dolu kaptaki yumurta yüzeye daha yakınken çatlaması beklenir, Yağ dolu kaptaki yumurtanın ise daha derinde çatlaması beklenir.\n"], "soruIndex": 4 },
            { "cevaplar": ["Derinlik X Sıvı yoğunluğu X yerçekimi ivmesi.\n"], "soruIndex": 5 },
            { "cevaplar": ["Sıvı basıncı derinlik, sıvı yoğunluğu, yerçekimi ivmesiyle doğru orantılıdır."], "soruIndex": 6 },
            { "cevaplar": ["Dalgıçların derine daldıkça vurgun etkisi yemesi.\n"], "soruIndex": 7 },
            { "cevaplar": ["Bu deney uygulanarak hipotez kanıtlanabilir."], "soruIndex": 8 },
            { "cevaplar": ["Daha çeşitli yoğunluklu sıvılar kullanılabilir ve yerçekimi farklı ortamlar kullanılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2509",
        "adSoyad": "Aslı Özkan",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvının derinliği, yoğunluğu arttıkça basınç artar; deneyin yapıldığı yerdeki yerçekimi arttıkça da basınç artar."], "soruIndex": 0 },
            { "cevaplar": ["Beherglas, iki ucu açık boru, balon, yerçekimi kullanılır."], "soruIndex": 1 },
            { "cevaplar": ["Deney yapılırken kullanılan malzemeler hasarlı olmamalıdır, yerçekimi uygun olmalıdır çünkü o zaman deney eksik ve yanlış olur bu da hipotezi yanlış çıkarır."], "soruIndex": 2 },
            { "cevaplar": ["1 kaba su doldurulur iki ucu açık tüpün iki ucuna balon bağlanır bir ucu batırdıkça sıvı basıncı arttığı için aşağıdaki balonun içindeki hava basınçtan dolayı yukardaki balona çıkar üstteki balon şişer bu deney derinlik ve yoğunluk ve yer çekimi için üç farklı versiyon halinde hazırlanır."], "soruIndex": 3 },
            { "cevaplar": ["Yoğunluk ile alakalı deneyde yoğunluğu fazla olan sıvıya batırılan borunun ucundaki balon diğer yoğunluğu az olan sıvıdan daha fazla şişer \nDerinliği fazla olan kaba batırıldığında derinliği az olan kaptan daha fazla şişer çünkü derinlik ile basınç doğru orantılıdır \nYerçekimi ise ekvatorda daha az kutuplarda daha fazla olduğu için basınçlar farklı olur."], "soruIndex": 4 },
            { "cevaplar": ["P=h.p.g\nP= sıvı basıncı\nh=derinlik\np= sıvının yoğunluğu\ng= yerçekimi ivmesi"], "soruIndex": 5 },
            { "cevaplar": ["Sıvı basıncı derinlik, yoğunluk ve yerçekimi ile doğru orantılıdır."], "soruIndex": 6 },
            { "cevaplar": ["Dalgıçın suya daldıkça üzerine uygulanan sıvı basıncı arttığı için burnunun ve kulaklarının kanaması"], "soruIndex": 7 },
            { "cevaplar": ["Hipotezimiz doğrudur çünkü etki edenler doğru orantılıdır."], "soruIndex": 8 },
            { "cevaplar": ["Yerçekimi farkının daha fazla olduğu yerlerde yapılabilir, yoğunluk farkının daha fazla olduğu yerlerde yapılabilir, derinlik daha fazla arttırılıp yapılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2530",
        "adSoyad": "Melis Mina Güler",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvının derinliği, yoğunluğu arttıkça basınç artar; deneyin yapıldığı yerdeki yerçekimi arttıkça da basınç artar."], "soruIndex": 0 },
            { "cevaplar": ["Beherglas, iki ucu açık boru, balon, yerçekimi kullanılır."], "soruIndex": 1 },
            { "cevaplar": ["Deney yapılırken kullanılan malzemeler hasarlı olmamalıdır, yerçekimi uygun olmalıdır çünkü o zaman deney eksik ve yanlış olur bu da hipotezi yanlış çıkarır."], "soruIndex": 2 },
            { "cevaplar": ["1 kaba su doldurulur iki ucu açık tüpün iki ucuna balon bağlanır bir ucu batırdıkça sıvı basıncı arttığı için aşağıdaki balonun içindeki hava basınçtan dolayı yukardaki balona çıkar üstteki balon şişer bu deney derinlik ve yoğunluk ve yer çekimi için üç farklı versiyon halinde hazırlanır."], "soruIndex": 3 },
            { "cevaplar": ["Yoğunluk ile alakalı deneyde yoğunluğu fazla olan sıvıya batırılan borunun ucundaki balon diğer yoğunluğu az olan sıvıdan daha fazla şişer \nDerinliği fazla olan kaba batırıldığında derinliği az olan kaptan daha fazla şişer çünkü derinlik ile basınç doğru orantılıdır \nYerçekimi ise ekvatorda daha az kutuplarda daha fazla olduğu için basınçlar farklı olur."], "soruIndex": 4 },
            { "cevaplar": ["P=h.p.g\nP= sıvı basıncı\nh=derinlik\np= sıvının yoğunluğu\ng= yerçekimi ivmesi"], "soruIndex": 5 },
            { "cevaplar": ["Sıvı basıncı derinlik, yoğunluk ve yerçekimi ile doğru orantılıdır."], "soruIndex": 6 },
            { "cevaplar": ["Dalgıçın suya daldıkça üzerine uygulanan sıvı basıncı arttığı için burnunun ve kulaklarının kanaması"], "soruIndex": 7 },
            { "cevaplar": ["Hipotezimiz doğrudur çünkü etki edenler doğru orantılıdır."], "soruIndex": 8 },
            { "cevaplar": ["Yerçekimi farkının daha fazla olduğu yerlerde yapılabilir, yoğunluk farkının daha fazla olduğu yerlerde yapılabilir, derinlik daha fazla arttırılıp yapılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2504",
        "adSoyad": "Yunus Gülsen",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvılarda basınç ; sıvıların derinliğine ,yoğunluğuna ve yerçekimi ivmesine bağlıdır ve bunlarla doğru orantılıdır."], "soruIndex": 0 },
            { "cevaplar": ["2 adet kap,tuzlu su,tatlı su,basınç ölçer, iki adet eş taş kullanılacak.Deney eşit yükseltide yapılacak ve taşlar eşit derinliğe bırakılacak."], "soruIndex": 1 },
            { "cevaplar": ["Taşlar aynı kütlede ve aynı hacimde olmalıdır.Kaplardaki su seviyeleri aynı olmalıdır.Taşlar aynı yükseltiden bırakılmalıdır.Deneyler eşit yükseltide yapılmalıdır.Dikkat etmezsek hipotezimiz doğrulanmaz ve bilim dünyasına yanlış bilgi sunulmuş olur.Buda sonraki deneylerin çoğunu yanıltabilir."], "soruIndex": 2 },
            { "cevaplar": ["İki adet kabı eş yükseltide koyacağız ve içlerine birinde tatlı birinde tuzlu olmak üzere eşit kütle ve hacimdeki suları koyacağız.İki adet eş büyüklükte ve kütlede taşlar kapların üzerine eş yükseltiden bırakılır.Yoğunluk ve derinliğe bağlı veriler elde edilir."], "soruIndex": 3 },
            { "cevaplar": ["Daha yoğun olan tuzlu suyun içerisindeki taşın daha yavaş batması beklenir, öte yandan tatlı suda yoğunluk daha az olduğu için taş daha hızlı batar."], "soruIndex": 4 },
            { "cevaplar": ["P=h•d•g"], "soruIndex": 5 },
            { "cevaplar": ["Yoğunluk arttıkça,derinlik arttıkça basınç artar"], "soruIndex": 6 },
            { "cevaplar": [" Denizde daha yavaş batılır ancak gölde girilirse daha hızlı batılır"], "soruIndex": 7 },
            { "cevaplar": ["Hipotezimiz kesinlikle doğrudur söyleyebiliriz.Aynı kütlede ve hacimde taşlar kullandık.Yerçekimi ivmemizi eşit tuttuk genel olarak deneyin doğru ilerlerdiğini söyleyebiliriz."], "soruIndex": 8 },
            { "cevaplar": ["Gerçek denizde ve gölde yapabiliriz kaplar yerine ve daha profesyonel ve gelişmiş basınç ölçerler kullanabiliriz.Ayrıca taş yerine eşit başka canlılar kullanabiliriz"], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2518",
        "adSoyad": "Ezel deniz karakaya",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvının derinliği, yoğunluğu arttıkça basınç artar; deneyin yapıldığı yerdeki yerçekimi arttıkça da basınç artar."], "soruIndex": 0 },
            { "cevaplar": ["Beherglas, iki ucu açık boru, balon, yerçekimi kullanılır."], "soruIndex": 1 },
            { "cevaplar": ["Deney yapılırken kullanılan malzemeler hasarlı olmamalıdır, yerçekimi uygun olmalıdır çünkü o zaman deney eksik ve yanlış olur bu da hipotezi yanlış çıkarır."], "soruIndex": 2 },
            { "cevaplar": ["1 kaba su doldurulur iki ucu açık tüpün iki ucuna balon bağlanır bir ucu batırdıkça sıvı basıncı arttığı için aşağıdaki balonun içindeki hava basınçtan dolayı yukardaki balona çıkar üstteki balon şişer bu deney derinlik ve yoğunluk ve yer çekimi için üç farklı versiyon halinde hazırlanır."], "soruIndex": 3 },
            { "cevaplar": ["Yoğunluk ile alakalı deneyde yoğunluğu fazla olan sıvıya batırılan borunun ucundaki balon diğer yoğunluğu az olan sıvıdan daha fazla şişer \nDerinliği fazla olan kaba batırıldığında derinliği az olan kaptan daha fazla şişer çünkü derinlik ile basınç doğru orantılıdır \nYerçekimi ise ekvatorda daha az kutuplarda daha fazla olduğu için basınçlar farklı olur."], "soruIndex": 4 },
            { "cevaplar": ["P=h.p.g\nP= sıvı basıncı\nh=derinlik\np= sıvının yoğunluğu\ng= yerçekimi ivmesi"], "soruIndex": 5 },
            { "cevaplar": ["Sıvı basıncı derinlik, yoğunluk ve yerçekimi ile doğru orantılıdır."], "soruIndex": 6 },
            { "cevaplar": ["Dalgıçın suya daldıkça üzerine uygulanan sıvı basıncı arttığı için burnunun ve kulaklarının kanaması"], "soruIndex": 7 },
            { "cevaplar": ["Hipotezimiz doğrudur çünkü etki edenler doğru orantılıdır."], "soruIndex": 8 },
            { "cevaplar": ["Yerçekimi farkının daha fazla olduğu yerlerde yapılabilir, yoğunluk farkının daha fazla olduğu yerlerde yapılabilir, derinlik daha fazla arttırılıp yapılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2529",
        "adSoyad": "Eylül Su Şengül",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvı basıncı sıvının yoğunluğuna bağlıdır.Yoğunluğu büyük olan sıvının basıncı büyüktür.Yoğunluğu büyük olan sıvıyı iletmek daha çok kuvvet ister."], "soruIndex": 0 },
            { "cevaplar": ["Enjektör,su,cıva,serum hortumu ve bant.Koşullar;özdeş enjektör,özdeş ortam,farklı sıvılar,aynı sıcaklık,aynı madde hacmi."], "soruIndex": 1 },
            { "cevaplar": ["Cıvanın insan vücuduyla temas etmemesine dikkat etmeliyiz (insan sağlığı için oldukça tehlikeli)ve suyla cıvanın temas etmediğinden (deneyin doğruluğu için) emin olmalıyız.Eldiven,önlük,gözlük gibi labarotuvar araç gereçlerini kullanmaya özen göstermeliyiz."], "soruIndex": 2 },
            { "cevaplar": ["Hacimleri eşit olmalıdır çünkü biz yoğunluğun sıvı basıncına olan etkisini gözlemlemek istiyoruz işin içine derinliği katmadan", "Ortam sıcaklığının aynı olması gerekmektedir ki maddenin o anki sıvı haline etki etmesin", "Enjektörleri yoğunluğun iletiminde nasıl rol oynadığını (iletimi zor mu kolay mı ne kadar güç uyguladık vs.) göstermek amacıyla kullandık", "Serum hortumlarını sıvıyı belirli bir düzlemde iletmek için kullandık", "Su ve cıvayı yoğunluğu farklı olan hacimleri eşit olan maddelerin basıncını araştırmak ve basıncı iletmek için kullandık", "Bantı ise mekanizmadaki parçaları sabit tutmak için kullandık"], "soruIndex": 3 },
            { "cevaplar": ["Suyun yoğunluğu cıvanın yoğunluğunun 1/13 katıdır.Bu yüzden suyu iletmek için çok büyük bir kuvvet uygulamayız (herkesin yapabileceği uygun bir kuvvet yeterlidir)Ancak su yerine cıva kullanılırsa çok devasa kuvvetler uygulamamız gerekir çünkü cıvanın yoğunluğu suyun yoğunluğunun 13 katıdır.Beklediğimiz sonuç ise suyla sıvaya kıyasla çok kolay iletim."], "soruIndex": 4 },
            { "cevaplar": ["Basınç (P)= derinlik (h) • yoğunluk (d). yer çekimi (g)"], "soruIndex": 5 },
            { "cevaplar": ["Durgun sıvılarda basınç yoğunluk ve derinliğin çarpımına bağlıdır."], "soruIndex": 6 },
            { "cevaplar": ["Hidrolik sistemler"], "soruIndex": 7 },
            { "cevaplar": ["Hipotezimiz doğrudur.Suyun iletimi cıvaya kıyasla çok daha az bir kuvvetle mümkündür."], "soruIndex": 8 },
            { "cevaplar": ["Deneyde ortaya çıkan basınç farkını daha net ölçmek adına basınç ölçer kullanılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2511",
        "adSoyad": "Alara Berke Can",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvı basıncı derinliğe, yerçekimi ivmesine ve yoğunluğa bağlıdır."], "soruIndex": 0 },
            { "cevaplar": ["Yumurta, Özdeş Yağ Dolu Kap, Özdeş saf su dolu kap, 25 Derece oda sıcaklığı."], "soruIndex": 1 },
            { "cevaplar": ["Kapların eş hacimli olması, Yumurtaların özdeş olması, Deneyin deniz seviyesinde olması."], "soruIndex": 2 },
            { "cevaplar": ["Özdeş yağ ve saf su dolu kaplara yumurtalar batırılır, Yumurtalar sıvıda derine indirilir ve değişimler gözlenir."], "soruIndex": 3 },
            { "cevaplar": ["Saf su dolu kaptaki yumurta yüzeye daha yakınken çatlaması beklenir, Yağ dolu kaptaki yumurtanın ise daha derinde çatlaması beklenir.\n"], "soruIndex": 4 },
            { "cevaplar": ["Derinlik X Sıvı yoğunluğu X yerçekimi ivmesi.\n"], "soruIndex": 5 },
            { "cevaplar": ["Sıvı basıncı derinlik, sıvı yoğunluğu, yerçekimi ivmesiyle doğru orantılıdır."], "soruIndex": 6 },
            { "cevaplar": ["Dalgıçların derine daldıkça vurgun etkisi yemesi.\n"], "soruIndex": 7 },
            { "cevaplar": ["Bu deney uygulanarak hipotez kanıtlanabilir."], "soruIndex": 8 },
            { "cevaplar": ["Daha çeşitli yoğunluklu sıvılar kullanılabilir ve yerçekimi farklı ortamlar kullanılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2527",
        "adSoyad": "Esila Ünsever",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvılarda basınç ; sıvıların derinliğine ,yoğunluğuna ve yerçekimi ivmesine bağlıdır ve bunlarla doğru orantılıdır."], "soruIndex": 0 },
            { "cevaplar": ["2 adet kap,tuzlu su,tatlı su,basınç ölçer, iki adet eş taş kullanılacak.Deney eşit yükseltide yapılacak ve taşlar eşit derinliğe bırakılacak."], "soruIndex": 1 },
            { "cevaplar": ["Taşlar aynı kütlede ve aynı hacimde olmalıdır.Kaplardaki su seviyeleri aynı olmalıdır.Taşlar aynı yükseltiden bırakılmalıdır.Deneyler eşit yükseltide yapılmalıdır.Dikkat etmezsek hipotezimiz doğrulanmaz ve bilim dünyasına yanlış bilgi sunulmuş olur.Buda sonraki deneylerin çoğunu yanıltabilir."], "soruIndex": 2 },
            { "cevaplar": ["İki adet kabı eş yükseltide koyacağız ve içlerine birinde tatlı birinde tuzlu olmak üzere eşit kütle ve hacimdeki suları koyacağız.İki adet eş büyüklükte ve kütlede taşlar kapların üzerine eş yükseltiden bırakılır.Yoğunluk ve derinliğe bağlı veriler elde edilir."], "soruIndex": 3 },
            { "cevaplar": ["Daha yoğun olan tuzlu suyun içerisindeki taşın daha yavaş batması beklenir, öte yandan tatlı suda yoğunluk daha az olduğu için taş daha hızlı batar."], "soruIndex": 4 },
            { "cevaplar": ["P=h•d•g"], "soruIndex": 5 },
            { "cevaplar": ["Yoğunluk arttıkça,derinlik arttıkça basınç artar"], "soruIndex": 6 },
            { "cevaplar": [" Denizde daha yavaş batılır ancak gölde girilirse daha hızlı batılır"], "soruIndex": 7 },
            { "cevaplar": ["Hipotezimiz kesinlikle doğrudur söyleyebiliriz.Aynı kütlede ve hacimde taşlar kullandık.Yerçekimi ivmemizi eşit tuttuk genel olarak deneyin doğru ilerlerdiğini söyleyebiliriz."], "soruIndex": 8 },
            { "cevaplar": ["Gerçek denizde ve gölde yapabiliriz kaplar yerine ve daha profesyonel ve gelişmiş basınç ölçerler kullanabiliriz.Ayrıca taş yerine eşit başka canlılar kullanabiliriz"], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2514",
        "adSoyad": "Tuna Özcan",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvı basıncı sıvının yoğunluğuna bağlıdır.Yoğunluğu büyük olan sıvının basıncı büyüktür.Yoğunluğu büyük olan sıvıyı iletmek daha çok kuvvet ister."], "soruIndex": 0 },
            { "cevaplar": ["Enjektör,su,cıva,serum hortumu ve bant.Koşullar;özdeş enjektör,özdeş ortam,farklı sıvılar,aynı sıcaklık,aynı madde hacmi."], "soruIndex": 1 },
            { "cevaplar": ["Cıvanın insan vücuduyla temas etmemesine dikkat etmeliyiz (insan sağlığı için oldukça tehlikeli)ve suyla cıvanın temas etmediğinden (deneyin doğruluğu için) emin olmalıyız.Eldiven,önlük,gözlük gibi labarotuvar araç gereçlerini kullanmaya özen göstermeliyiz."], "soruIndex": 2 },
            { "cevaplar": ["Hacimleri eşit olmalıdır çünkü biz yoğunluğun sıvı basıncına olan etkisini gözlemlemek istiyoruz işin içine derinliği katmadan", "Ortam sıcaklığının aynı olması gerekmektedir ki maddenin o anki sıvı haline etki etmesin", "Enjektörleri yoğunluğun iletiminde nasıl rol oynadığını (iletimi zor mu kolay mı ne kadar güç uyguladık vs.) göstermek amacıyla kullandık", "Serum hortumlarını sıvıyı belirli bir düzlemde iletmek için kullandık", "Su ve cıvayı yoğunluğu farklı olan hacimleri eşit olan maddelerin basıncını araştırmak ve basıncı iletmek için kullandık", "Bantı ise mekanizmadaki parçaları sabit tutmak için kullandık"], "soruIndex": 3 },
            { "cevaplar": ["Suyun yoğunluğu cıvanın yoğunluğunun 1/13 katıdır.Bu yüzden suyu iletmek için çok büyük bir kuvvet uygulamayız (herkesin yapabileceği uygun bir kuvvet yeterlidir)Ancak su yerine cıva kullanılırsa çok devasa kuvvetler uygulamamız gerekir çünkü cıvanın yoğunluğu suyun yoğunluğunun 13 katıdır.Beklediğimiz sonuç ise suyla sıvaya kıyasla çok kolay iletim."], "soruIndex": 4 },
            { "cevaplar": ["Basınç (P)= derinlik (h) • yoğunluk (d). yer çekimi (g)"], "soruIndex": 5 },
            { "cevaplar": ["Durgun sıvılarda basınç yoğunluk ve derinliğin çarpımına bağlıdır."], "soruIndex": 6 },
            { "cevaplar": ["Hidrolik sistemler"], "soruIndex": 7 },
            { "cevaplar": ["Hipotezimiz doğrudur.Suyun iletimi cıvaya kıyasla çok daha az bir kuvvetle mümkündür."], "soruIndex": 8 },
            { "cevaplar": ["Deneyde ortaya çıkan basınç farkını daha net ölçmek adına basınç ölçer kullanılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2519",
        "adSoyad": "Semih Efe Koç",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvı basıncı derinliğe, yerçekimi ivmesine ve yoğunluğa bağlıdır."], "soruIndex": 0 },
            { "cevaplar": ["Yumurta, Özdeş Yağ Dolu Kap, Özdeş saf su dolu kap, 25 Derece oda sıcaklığı."], "soruIndex": 1 },
            { "cevaplar": ["Kapların eş hacimli olması, Yumurtaların özdeş olması, Deneyin deniz seviyesinde olması."], "soruIndex": 2 },
            { "cevaplar": ["Özdeş yağ ve saf su dolu kaplara yumurtalar batırılır, Yumurtalar sıvıda derine indirilir ve değişimler gözlenir."], "soruIndex": 3 },
            { "cevaplar": ["Saf su dolu kaptaki yumurta yüzeye daha yakınken çatlaması beklenir, Yağ dolu kaptaki yumurtanın ise daha derinde çatlaması beklenir.\n"], "soruIndex": 4 },
            { "cevaplar": ["Derinlik X Sıvı yoğunluğu X yerçekimi ivmesi.\n"], "soruIndex": 5 },
            { "cevaplar": ["Sıvı basıncı derinlik, sıvı yoğunluğu, yerçekimi ivmesiyle doğru orantılıdır."], "soruIndex": 6 },
            { "cevaplar": ["Dalgıçların derine daldıkça vurgun etkisi yemesi.\n"], "soruIndex": 7 },
            { "cevaplar": ["Bu deney uygulanarak hipotez kanıtlanabilir."], "soruIndex": 8 },
            { "cevaplar": ["Daha çeşitli yoğunluklu sıvılar kullanılabilir ve yerçekimi farklı ortamlar kullanılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2521",
        "adSoyad": "Mesutislam BAYRAM",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvı basıncı derinliğe, yerçekimi ivmesine and yoğunluğa bağlıdır."], "soruIndex": 0 },
            { "cevaplar": ["Yumurta, Özdeş Yağ Dolu Kap, Özdeş saf su dolu kap, 25 Derece oda sıcaklığı."], "soruIndex": 1 },
            { "cevaplar": ["Kapların eş hacimli olması, Yumurtaların özdeş olması, Deneyin deniz seviyesinde olması."], "soruIndex": 2 },
            { "cevaplar": ["Özdeş yağ ve saf su dolu kaplara yumurtalar batırılır, Yumurtalar sıvıda derine indirilir ve değişimler gözlenir."], "soruIndex": 3 },
            { "cevaplar": ["Saf su dolu kaptaki yumurta yüzeye daha yakınken çatlaması beklenir, Yağ dolu kaptaki yumurtanın ise daha derinde çatlaması beklenir.\n"], "soruIndex": 4 },
            { "cevaplar": ["Derinlik X Sıvı yoğunluğu X yerçekimi ivmesi.\n"], "soruIndex": 5 },
            { "cevaplar": ["Sıvı basıncı derinlik, sıvı yoğunluğu, yerçekimi ivmesiyle doğru orantılıdır."], "soruIndex": 6 },
            { "cevaplar": ["Dalgıçların derine daldıkça vurgun etkisi yemesi.\n"], "soruIndex": 7 },
            { "cevaplar": ["Bu deney uygulanarak hipotez kanıtlanabilir."], "soruIndex": 8 },
            { "cevaplar": ["Daha çeşitli yoğunluklu sıvılar kullanılabilir and yerçekimi farklı ortamlar kullanılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2508",
        "adSoyad": "Naz SÜSLÜ",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvı basıncı sıvının yoğunluğuna bağlıdır.Yoğunluğu büyük olan sıvının basıncı büyüktür.Yoğunluğu büyük olan sıvıyı iletmek daha çok kuvvet ister."], "soruIndex": 0 },
            { "cevaplar": ["Enjektör,su,cıva,serum hortumu and bant.Koşullar;özdeş enjektör,özdeş ortam,farklı sıvılar,aynı sıcaklık,aynı madde hacmi."], "soruIndex": 1 },
            { "cevaplar": ["Cıvanın insan vücuduyla temas etmemesine dikkat etmeliyiz (insan sağlığı için oldukça tehlikeli)ve suyla cıvanın temas etmediğinden (deneyin doğruluğu için) emin olmalıyız.Eldiven,önlük,gözlük gibi labarotuvar araç gereçlerini kullanmaya özen göstermeliyiz."], "soruIndex": 2 },
            { "cevaplar": ["Hacimleri eşit olmalıdır çünkü biz yoğunluğun sıvı basıncına olan etkisini gözlemlemek istiyoruz işin içine derinliği katmadan", "Ortam sıcaklığının aynı olması gerekmektedir ki maddenin o anki sıvı haline etki etmesin", "Enjektörleri yoğunluğun iletiminde nasıl rol oynadığını (iletimi zor mu kolay mı ne kadar güç uyguladık vs.) göstermek amacıyla kullandık", "Serum hortumlarını sıvıyı belirli bir düzlemde iletmek için kullandık", "Su and cıvayı yoğunluğu farklı olan hacimleri eşit olan maddelerin basıncını araştırmak and basıncı iletmek için kullandık", "Bantı ise mekanizmadaki parçaları sabit tutmak için kullandık"], "soruIndex": 3 },
            { "cevaplar": ["Suyun yoğunluğu cıvanın yoğunluğunun 1/13 katıdır.Bu yüzden suyu iletmek için çok büyük bir kuvvet uygulamayız (herkesin yapabileceği uygun bir kuvvet yeterlidir)Ancak su yerine cıva kullanılırsa çok devasa kuvvetler uygulamamız gerekir çünkü cıvanın yoğunluğu suyun yoğunluğunun 13 katıdır.Beklediğimiz sonuç ise suyla sıvaya kıyasla çok kolay iletim."], "soruIndex": 4 },
            { "cevaplar": ["Basınç (P)= derinlik (h) • yoğunluk (d). yer çekimi (g)"], "soruIndex": 5 },
            { "cevaplar": ["Durgun sıvılarda basınç yoğunluk and derinliğin çarpımına bağlıdır."], "soruIndex": 6 },
            { "cevaplar": ["Hidrolik sistemler"], "soruIndex": 7 },
            { "cevaplar": ["Hipotezimiz doğrudur.Suyun iletimi cıvaya kıyasla çok daha az bir kuvvetle mümkündür."], "soruIndex": 8 },
            { "cevaplar": ["Deneyde ortaya çıkan basınç farkını daha net ölçmek adına basınç ölçer kullanılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2524",
        "adSoyad": "Atlas ÖZELSOY",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Derinlige, yogunluga, yercekimi ivmesine baglidir", "hipotez:”sivi icinde derinlik arttikca basinc artar.”", "hipotez:”sivi yogunlugu arttikca basinc artar.”"], "soruIndex": 0 },
            { "cevaplar": ["MALZEMELER\nSeffaf buyuk kap (fanus veya legen)\nBalon\nip\nsu\nyag\ncetvel\nagirlik (balon batmasi icin tas)\nKOSULLAR\nAyni sicaklik\nayni miktar sivi\nayni buyuklukte balonlar"], "soruIndex": 1 },
            { "cevaplar": ["Balonlarin buyuklugu esit olmali", "balonlar ayni miktar sisirilmeli", "derinlik olcumu dikkatli yapilmali", "sivi miktarlari esit ayarlanmali"], "soruIndex": 2 },
            { "cevaplar": ["balonlar esit miktarda sisirilir, ipler yardimiyla balonlar kabin farkli derinliklerine yerlestirilir (yuzeye yakin and dibe yakin), balon sekilleri gozlemlenir, daha sonra balonlarin 1 tanesi yag 1 tanesi su and esit derinlik olacak sekilde tekrarlanir"], "soruIndex": 3 },
            { "cevaplar": ["Su icinde olanlarda: en dipteki daha cok kuculur (derinlik arttikca basinc artar)", "yag and su: sudaki daha kucuk olur (yogunluk arttikca basinc artar)"], "soruIndex": 4 },
            { "cevaplar": ["P=h•d•g"], "soruIndex": 5 },
            { "cevaplar": ["h artarsa P artar", "d artarsa P artar", "ayni derinlik and yogunlukta basinc esit", "kap sekli onemli degil"], "soruIndex": 6 },
            { "cevaplar": ["Dalgiclar derine daldikca uzerlerindeki basinc artar", "Derinde cisimler sikisabilir", "Sise delinirse alttn daha uzaga and hizli su cikar", "derine giden denizaltlari daha dayanikli yapilir"], "soruIndex": 7 },
            { "cevaplar": ["Deney sonucu hipotezi destekler.Derinlik arttiikca basincin attigi gozlemlenır.", "Deney sonucu hıpotezı destekler yogunluk arttıkca sıvı basıncı artar"], "soruIndex": 8 },
            { "cevaplar": ["Basınc olcer kullanılabılır", "Daha derın kap kullanılabılır", "farkı yoğunlukta sıvılar denenebılır", "balon yerıne baska maddeler kullanılabılır"], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2528",
        "adSoyad": "Eslem corekci",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Derinlige, yogunluga, yercekimi ivmesine baglidir", "hipotez:”sivi icinde derinlik arttikca basinc artar.”", "hipotez:”sivi yogunlugu arttikca basinc artar.”"], "soruIndex": 0 },
            { "cevaplar": ["MALZEMELER\nSeffaf buyuk kap (fanus veya legen)\nBalon\nip\nsu\nyag\ncetvel\nagirlik (balon batmasi icin tas)\nKOSULLAR\nAyni sicaklik\nayni miktar sivi\nayni buyuklukte balonlar"], "soruIndex": 1 },
            { "cevaplar": ["Balonlarin buyuklugu esit olmali", "balonlar ayni miktar sisirilmeli", "derinlik olcumu dikkatli yapilmali", "sivi miktarlari esit ayarlanmali"], "soruIndex": 2 },
            { "cevaplar": ["balonlar esit miktarda sisirilir, ipler yardimiyla balonlar kabin farkli derinliklerine yerlestirilir (yuzeye yakin and dibe yakin), balon sekilleri gozlemlenir, daha sonra balonlarin 1 tanesi yag 1 tanesi su and esit derinlik olacak sekilde tekrarlanir"], "soruIndex": 3 },
            { "cevaplar": ["Su icinde olanlarda: en dipteki daha cok kuculur (derinlik arttikca basinc artar)", "yag and su: sudaki daha kucuk olur (yogunluk arttikca basinc artar)"], "soruIndex": 4 },
            { "cevaplar": ["P=h•d•g"], "soruIndex": 5 },
            { "cevaplar": ["h artarsa P artar", "d artarsa P artar", "ayni derinlik and yogunlukta basinc esit", "kap sekli onemli degil"], "soruIndex": 6 },
            { "cevaplar": ["Dalgiclar derine daldikca uzerlerindeki basinc artar", "Derinde cisimler sikisabilir", "Sise delinirse alttn daha uzaga and hizli su cikar", "derine giden denizaltlari daha dayanikli yapilir"], "soruIndex": 7 },
            { "cevaplar": ["Deney sonucu hipotezi destekler.Derinlik arttiikca basincin attigi gozlemlenır.", "Deney sonucu hıpotezı destekler yogunluk arttıkca sıvı basıncı artar"], "soruIndex": 8 },
            { "cevaplar": ["Basınc olcer kullanılabılır", "Daha derın kap kullanılabılır", "farkı yoğunlukta sıvılar denenebılır", "balon yerıne baska maddeler kullanılabılır"], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2523",
        "adSoyad": "Eylül Fatma Kavak",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Derinlige, yogunluga, yercekimi ivmesine baglidir", "hipotez:”sivi icinde derinlik arttikca basinc artar.”", "hipotez:”sivi yogunlugu arttikca basinc artar.”"], "soruIndex": 0 },
            { "cevaplar": ["MALZEMELER\nSeffaf buyuk kap (fanus veya legen)\nBalon\nip\nsu\nyag\ncetvel\nagirlik (balon batmasi icin tas)\nKOSULLAR\nAyni sicaklik\nayni miktar sivi\nayni buyuklukte balonlar"], "soruIndex": 1 },
            { "cevaplar": ["Balonlarin buyuklugu esit olmali", "balonlar ayni miktar sisirilmeli", "derinlik olcumu dikkatli yapilmali", "sivi miktarlari esit ayarlanmali"], "soruIndex": 2 },
            { "cevaplar": ["balonlar esit miktarda sisirilir, ipler yardimiyla balonlar kabin farkli derinliklerine yerlestirilir (yuzeye yakin and dibe yakin), balon sekilleri gozlemlenir, daha sonra balonlarin 1 tanesi yag 1 tanesi su and esit derinlik olacak sekilde tekrarlanir"], "soruIndex": 3 },
            { "cevaplar": ["Su icinde olanlarda: en dipteki daha cok kuculur (derinlik arttikca basinc artar)", "yag and su: sudaki daha kucuk olur (yogunluk arttikca basinc artar)"], "soruIndex": 4 },
            { "cevaplar": ["P=h•d•g"], "soruIndex": 5 },
            { "cevaplar": ["h artarsa P artar", "d artarsa P artar", "ayni derinlik and yogunlukta basinc esit", "kap sekli onemli degil"], "soruIndex": 6 },
            { "cevaplar": ["Dalgiclar derine daldikca uzerlerindeki basinc artar", "Derinde cisimler sikisabilir", "Sise delinirse alttn daha uzaga and hizli su cikar", "derine giden denizaltlari daha dayanikli yapilir"], "soruIndex": 7 },
            { "cevaplar": ["Deney sonucu hipotezi destekler.Derinlik arttiikca basincin attigi gozlemlenır.", "Deney sonucu hıpotezı destekler yogunluk arttıkca sıvı basıncı artar"], "soruIndex": 8 },
            { "cevaplar": ["Basınc olcer kullanılabılır", "Daha derın kap kullanılabılır", "farkı yoğunlukta sıvılar denenebılır", "balon yerıne baska maddeler kullanılabılır"], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2515",
        "adSoyad": "Furkan Tekin",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Derinlige, yogunluga, yercekimi ivmesine baglidir", "hipotez:”sivi icinde derinlik arttikca basinc artar.”", "hipotez:”sivi yogunlugu arttikca basinc artar.”"], "soruIndex": 0 },
            { "cevaplar": ["MALZEMELER\nSeffaf buyuk kap (fanus veya legen)\nBalon\nip\nsu\nyag\ncetvel\nagirlik (balon batmasi icin tas)\nKOSULLAR\nAyni sicaklik\nayni miktar sivi\nayni buyuklukte balonlar"], "soruIndex": 1 },
            { "cevaplar": ["Balonlarin buyuklugu esit olmali", "balonlar ayni miktar sisirilmeli", "derinlik olcumu dikkatli yapilmali", "sivi miktarlari esit ayarlanmali"], "soruIndex": 2 },
            { "cevaplar": ["balonlar esit miktarda sisirilir, ipler yardimiyla balonlar kabin farkli derinliklerine yerlestirilir (yuzeye yakin and dibe yakin), balon sekilleri gozlemlenir, daha sonra balonlarin 1 tanesi yag 1 tanesi su and esit derinlik olacak sekilde tekrarlanir"], "soruIndex": 3 },
            { "cevaplar": ["Su icinde olanlarda: en dipteki daha cok kuculur (derinlik arttikca basinc artar)", "yag and su: sudaki daha kucuk olur (yogunluk arttikca basinc artar)"], "soruIndex": 4 },
            { "cevaplar": ["P=h•d•g"], "soruIndex": 5 },
            { "cevaplar": ["h artarsa P artar", "d artarsa P artar", "ayni derinlik and yogunlukta basinc esit", "kap sekli onemli degil"], "soruIndex": 6 },
            { "cevaplar": ["Dalgiclar derine daldikca uzerlerindeki basinc artar", "Derinde cisimler sikisabilir", "Sise delinirse alttn daha uzaga and hizli su cikar", "derine giden denizaltlari daha dayanikli yapilir"], "soruIndex": 7 },
            { "cevaplar": ["Deney sonucu hipotezi destekler.Derinlik arttiikca basincin attigi gozlemlenır.", "Deney sonucu hıpotezı destekler yogunluk arttıkca sıvı basıncı artar"], "soruIndex": 8 },
            { "cevaplar": ["Basınc olcer kullanılabılır", "Daha derın kap kullanılabılır", "farkı yoğunlukta sıvılar denenebılır", "balon yerıne baska maddeler kullanılabılır"], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2522",
        "adSoyad": "Azra ÖZTAŞ",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvının derinliği, yoğunluğu arttıkça basınç artar; deneyin yapıldığı yerdeki yerçekimi arttıkça da basınç artar."], "soruIndex": 0 },
            { "cevaplar": ["Beherglas, iki ucu açık boru, balon, yerçekimi kullanılır."], "soruIndex": 1 },
            { "cevaplar": ["Deney yapılırken kullanılan malzemeler hasarlı olmamalıdır, yerçekimi uygun olmalıdır çünkü o zaman deney eksik and yanlış olur bu da hipotezi yanlış çıkarır."], "soruIndex": 2 },
            { "cevaplar": ["1 kaba su doldurulur iki ucu açık tüpün iki ucuna balon bağlanır bir ucu batırdıkça sıvı basıncı arttığı için aşağıdaki balonun içindeki hava basınçtan dolayı yukardaki balona çıkar üstteki balon şişer bu deney derinlik and yoğunluk and yer çekimi için üç farklı versiyon halinde hazırlanır."], "soruIndex": 3 },
            { "cevaplar": ["Yoğunluk ile alakalı deneyde yoğunluğu fazla olan sıvıya batırılan borunun ucundaki balon diğer yoğunluğu az olan sıvıdan daha fazla şişer \nDerinliği fazla olan kaba batırıldığında derinliği az olan kaptan daha fazla şişer çünkü derinlik ile basınç doğru orantılıdır \nYerçekimi ise ekvatorda daha az kutuplarda daha fazla olduğu için basınçlar farklı olur."], "soruIndex": 4 },
            { "cevaplar": ["P=h.p.g\nP= sıvı basıncı\nh=derinlik\np= sıvının yoğunluğu\ng= yerçekimi ivmesi"], "soruIndex": 5 },
            { "cevaplar": ["Sıvı basıncı derinlik, yoğunluk and yerçekimi ile doğru orantılıdır."], "soruIndex": 6 },
            { "cevaplar": ["Dalgıçın suya daldıkça üzerine uygulanan sıvı basıncı arttığı için burnunun and kulaklarının kanaması"], "soruIndex": 7 },
            { "cevaplar": ["Hipotezimiz doğrudur çünkü etki edenler doğru orantılıdır."], "soruIndex": 8 },
            { "cevaplar": ["Yerçekimi farkının daha fazla olduğu yerlerde yapılabilir, yoğunluk farkının daha fazla olduğu yerlerde yapılabilir, derinlik daha fazla arttırılıp yapılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2502",
        "adSoyad": "Buğra Yiğit Kalafat",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvının derinliği, yoğunluğu arttıkça basınç artar; deneyin yapıldığı yerdeki yerçekimi arttıkça da basınç artar."], "soruIndex": 0 },
            { "cevaplar": ["Beherglas, iki ucu açık boru, balon, yerçekimi kullanılır."], "soruIndex": 1 },
            { "cevaplar": ["Deney yapılırken kullanılan malzemeler hasarlı olmamalıdır, yerçekimi uygun olmalıdır çünkü o zaman deney eksik and yanlış olur bu da hipotezi yanlış çıkarır."], "soruIndex": 2 },
            { "cevaplar": ["1 kaba su doldurulur iki ucu açık tüpün iki ucuna balon bağlanır bir ucu batırdıkça sıvı basıncı arttığı için aşağıdaki balonun içindeki hava basınçtan dolayı yukardaki balona çıkar üstteki balon şişer bu deney derinlik and yoğunluk and yer çekimi için üç farklı versiyon halinde hazırlanır."], "soruIndex": 3 },
            { "cevaplar": ["Yoğunluk ile alakalı deneyde yoğunluğu fazla olan sıvıya batırılan borunun ucundaki balon diğer yoğunluğu az olan sıvıdan daha fazla şişer \nDerinliği fazla olan kaba batırıldığında derinliği az olan kaptan daha fazla şişer çünkü derinlik ile basınç doğru orantılıdır \nYerçekimi ise ekvatorda daha az kutuplarda daha fazla olduğu için basınçlar farklı olur."], "soruIndex": 4 },
            { "cevaplar": ["P=h.p.g\nP= sıvı basıncı\nh=derinlik\np= sıvının yoğunluğu\ng= yerçekimi ivmesi"], "soruIndex": 5 },
            { "cevaplar": ["Sıvı basıncı derinlik, yoğunluk and yerçekimi ile doğru orantılıdır."], "soruIndex": 6 },
            { "cevaplar": ["Dalgıçın suya daldıkça üzerine uygulanan sıvı basıncı arttığı için burnunun and kulaklarının kanaması"], "soruIndex": 7 },
            { "cevaplar": ["Hipotezimiz doğrudur çünkü etki edenler doğru orantılıdır."], "soruIndex": 8 },
            { "cevaplar": ["Yerçekimi farkının daha fazla olduğu yerlerde yapılabilir, yoğunluk farkının daha fazla olduğu yerlerde yapılabilir, derinlik daha fazla arttırılıp yapılabilir."], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    },
    {
        "ogrenciNo": "2516",
        "adSoyad": "Murat Emir KERTİL",
        "sinif": "10A",
        "cevaplar": [
            { "cevaplar": ["Sıvılarda basınç ; sıvıların derinliğine ,yoğunluğuna and yerçekimi ivmesine bağlıdır and bunlarla doğru orantılıdır."], "soruIndex": 0 },
            { "cevaplar": ["2 adet kap,tuzlu su,tatlı su,basınç ölçer, iki adet eş taş kullanılacak.Deney eşit yükseltide yapılacak and taşlar eşit derinliğe bırakılacak."], "soruIndex": 1 },
            { "cevaplar": ["Taşlar aynı kütlede and aynı hacimde olmalıdır.Kaplardaki su seviyeleri aynı olmalıdır.Taşlar aynı yükseltiden bırakılmalıdır.Deneyler eşit yükseltide yapılmalıdır.Dikkat etmezsek hipotezimiz doğrulanmaz and bilim dünyasına yanlış bilgi sunulmuş olur.Buda sonraki deneylerin çoğunu yanıltabilir."], "soruIndex": 2 },
            { "cevaplar": ["İki adet kabı eş yükseltide koyacağız and içlerine birinde tatlı birinde tuzlu olmak üzere eşit kütle and hacimdeki suları koyacağız.İki adet eş büyüklükte and kütlede taşlar kapların üzerine eş yükseltiden bırakılır.Yoğunluk and derinliğe bağlı veriler elde edilir."], "soruIndex": 3 },
            { "cevaplar": ["Daha yoğun olan tuzlu suyun içerisindeki taşın daha yavaş batması beklenir, öte yandan tatlı suda yoğunluk daha az olduğu için taş daha hızlı batar."], "soruIndex": 4 },
            { "cevaplar": ["P=h•d•g"], "soruIndex": 5 },
            { "cevaplar": ["Yoğunluk arttıkça,derinlik arttıkça basınç artar"], "soruIndex": 6 },
            { "cevaplar": [" Denizde daha yavaş batılır ancak gölde girilirse daha hızlı batılır"], "soruIndex": 7 },
            { "cevaplar": ["Hipotezimiz kesinlikle doğrudur söyleyebiliriz.Aynı kütlede and hacimde taşlar kullandık.Yerçekimi ivmemizi eşit tuttuk genel olarak deneyin doğru ilerlerdiğini söyleyebiliriz."], "soruIndex": 8 },
            { "cevaplar": ["Gerçek denizde and gölde yapabiliriz kaplar yerine and daha profesyonel and gelişmiş basınç ölçerler kullanabiliriz.Ayrıca taş yerine eşit başka canlılar kullanabiliriz"], "soruIndex": 9 }
        ],
        "puanlar": {},
        "degerlendirme": { "bitti": false }
    }
];

const studyId = 1; // "Sıvı Basıncı"

async function run() {
    try {
        console.log('🔄 Restoration started...');
        for (const student of rawData) {
            const query = `
                INSERT INTO student_evaluations (study_id, student_school_no, class_name, answers, scores, evaluation)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (study_id, student_school_no) 
                DO UPDATE SET 
                    class_name = EXCLUDED.class_name,
                    answers = EXCLUDED.answers,
                    scores = EXCLUDED.scores,
                    evaluation = EXCLUDED.evaluation;
            `;
            const values = [
                studyId,
                student.ogrenciNo,
                student.sinif,
                JSON.stringify(student.cevaplar),
                JSON.stringify(student.puanlar),
                JSON.stringify(student.degerlendirme)
            ];
            await pool.query(query, values);
            console.log(`✅ Restored: ${student.adSoyad} (${student.ogrenciNo})`);
        }
        console.log('🎉 Restoration completed successfully for 9A students.');
    } catch (e) {
        console.error('❌ Error during restoration:', e);
    } finally {
        await pool.end();
        process.exit();
    }
}

run();
