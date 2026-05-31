# CHAPITRE 1 — CONTEXTE ET PROBLÉMATIQUE

---

## 1.1 Introduction

Ce chapitre constitue le socle sur lequel repose l'ensemble du mémoire. Nous avons choisi de ne pas le traiter comme une simple revue de contexte — il s'agit plutôt de reconstituer le cheminement intellectuel qui nous a conduits, progressivement, d'un constat de terrain à la formulation d'une problématique de recherche appliquée. L'idée initiale du projet était relativement modeste : développer un dispositif GPS embarqué pour suivre les déplacements des tracteurs. Mais les échanges répétés avec les exploitants de la région de Sidi Bel Abbès, et en particulier avec M. Khelifa, ont fait émerger un besoin bien plus profond, lié à la maîtrise des traitements phytosanitaires dans leur globalité.

Nous commençons par caractériser le secteur agricole algérien dans ses dimensions économique, structurelle et stratégique (§1.2), en accordant une attention particulière à la wilaya de Sidi Bel Abbès qui constitue notre terrain d'étude. Nous analysons ensuite les contraintes spécifiques de la gestion phytosanitaire et les défaillances systémiques de la traçabilité manuelle (§1.3). La problématique centrale est formulée en §1.4. Nous la replaçons dans le contexte de la transformation numérique mondiale de l'agriculture, en distinguant les paradigmes 4.0 et 5.0 (§1.5). Enfin, les objectifs spécifiques du projet sont énoncés (§1.6) et le scénario de démonstration pour la soutenance est décrit (§1.7).

---

## 1.2 L'agriculture algérienne : enjeux et structure

### 1.2.1 Poids économique et stratégique

L'agriculture occupe une place qu'on aurait tort de sous-estimer dans l'économie algérienne. Selon les données consolidées du Ministère de l'Agriculture et du Développement Rural (MADR) et de l'Organisation des Nations Unies pour l'alimentation et l'agriculture (FAO), le secteur a contribué à hauteur de **11,6 % du PIB** en 2022, ce qui le place au troisième rang après les hydrocarbures et les services (ONS, 2023). Il emploie environ **2,5 millions de personnes**, soit près de 20 % de la population active, avec une proportion plus élevée encore dans les wilayas intérieures à vocation agricole (Bessaoud, 2019).

La Surface Agricole Utile (SAU) est évaluée à **8,5 millions d'hectares**, dont 7,5 millions de terres arables. Rapportée à un territoire de 2,38 millions de km² — dont plus de 80 % est saharien — cette SAU ne représente que 3,6 % de la superficie totale du pays (Réseau-FAR / MADR ; agriculture.gouv.fr, 2022). La Figure 1.1 ci-dessous illustre cette répartition.

> **Figure 1.1** — Répartition de la superficie totale de l'Algérie entre zones sahariennes, steppiques et agricoles utiles. *Source : MADR, 2022 ; traitée par les auteurs.*

Le ratio SAU/habitant constitue probablement l'indicateur le plus parlant de la pression foncière qui pèse sur le secteur. En 1962, au moment de l'indépendance, l'Algérie disposait de 0,73 hectare de SAU par habitant. En 2022, ce ratio est tombé à **0,22 ha/habitant**, soit une réduction de 70 % en six décennies (Chehat, 2008 ; calcul actualisé par les auteurs). Cette tendance, qui s'explique par la croissance démographique combinée à l'urbanisation des terres fertiles du Tell, fait de l'intensification durable des pratiques agricoles une nécessité et non un choix.

C'est dans ce contexte que l'État a renforcé ses engagements budgétaires. Le projet de loi de finances 2023 a mobilisé **700 milliards de dinars algériens** en soutien aux filières agricoles, avec des objectifs de croissance sectorielle ambitieux : 6,9 % en 2023 et 5,5 % en 2024 (Agri71, 2023). Le Plan National de Développement Agricole et Rural (PNDAR), prolongé sous différentes formes depuis 2000, a également encouragé l'investissement dans la mécanisation et l'irrigation (Daoudi et al., 2015). Cependant, comme le souligne Bessaoud (2019), ces politiques ont surtout ciblé les intrants et les équipements lourds, en laissant de côté la numérisation des processus de gestion — qui constitue pourtant un levier de productivité à moindre coût.

### 1.2.2 Structure des exploitations et implications pour la numérisation

La caractéristique la plus structurante du tissu agricole algérien est sa **fragmentation**. Les statistiques du MADR dénombrent **1 198 057 exploitations agricoles**, dont 50 % ont moins de 20 hectares et 26 % moins de 10 hectares (MADR, 2018). Cette atomisation est le produit historique de la redistribution foncière post-indépendance et de la loi d'orientation agricole de 2008 qui a favorisé les concessions de petite taille (Daoudi et al., 2015).

Cette réalité a des conséquences directes sur la numérisation. Les grandes plateformes internationales de *Farm Management Information Systems* (FMIS) — telles que Trimble Ag, Climate FieldView (Bayer) ou John Deere Operations Center — sont conçues pour des exploitations industrielles de plusieurs centaines d'hectares, opérant dans des contextes bien connectés, facturant en dollars ou en euros et proposant des interfaces exclusivement anglophones (Fountas et al., 2015 ; Kamilaris et al., 2017). Aucune de ces conditions n'est remplie dans la majorité du territoire algérien.

Cependant, entre les micro-exploitations de subsistance et les grandes fermes étatiques, il existe un segment intermédiaire en croissance : des exploitations privées de **50 à 500 hectares**, gérées par des exploitants ou des groupements familiaux qui disposent de la motivation et des ressources pour adopter des outils numériques, à condition que ceux-ci soient **adaptés à leurs contraintes réelles** : connectivité mobile variable (3G/4G intermittente), paiement en dinars algériens (DZD), interface bilingue français-arabe, et coût d'entrée compatible avec les marges agricoles algériennes.

Le **Tableau 1.1** résume cette segmentation.

> **Tableau 1.1** — Segmentation du tissu agricole algérien et accessibilité aux outils numériques

| Segment | Taille (ha) | Part du total | Accès aux FMIS internationaux | Cible LeadFarm |
|---|---|---|---|---|
| Micro-exploitations | < 10 | 26 % | Non (coût, langue, connectivité) | Non (phase 1) |
| Petites exploitations | 10–50 | ~35 % | Non | Potentiel (phase 2) |
| Exploitations moyennes | 50–200 | ~25 % | Partiel (coût prohibitif) | **Oui — cœur de cible** |
| Grandes exploitations | > 200 | ~14 % | Possible mais mal adapté | **Oui** |

*Source : MADR, 2018 ; segmentation par les auteurs.*

### 1.2.3 La wilaya de Sidi Bel Abbès : terrain d'étude

La wilaya de Sidi Bel Abbès, située dans le Tell occidental, est l'une des wilayas à plus forte vocation agricole de l'Ouest algérien. Sa SAU est estimée à **320 000 hectares**, dont une part significative dédiée aux grandes cultures (céréales, légumineuses) et à l'arboriculture (oliviers, vignes). La wilaya bénéficie d'un climat semi-aride avec une pluviométrie annuelle de 350 à 450 mm selon les stations, ce qui la situe dans la tranche favorable pour la céréaliculture pluviale, mais avec une variabilité interannuelle qui rend la maîtrise des intrants d'autant plus critique (DSA Sidi Bel Abbès, 2020).

Le **Domaine Khelifa**, notre exploitation partenaire, est représentatif de ce segment d'exploitations moyennes que nous ciblons. Il pratique principalement la céréaliculture (blé dur, orge) et dispose d'un parc de tracteurs équipés de pulvérisateurs. C'est un terrain idéal pour notre pilote, car il concentre les trois contraintes que LeadFarm cherche à résoudre : besoin de précision dans les traitements, exigence de traçabilité pour la conformité réglementaire, et connectivité mobile variable sur les parcelles les plus éloignées.

### 1.2.4 La céréaliculture : une filière exposée aux enjeux phytosanitaires

La céréaliculture représente environ **40 % de la SAU** en moyenne annuelle sur la période 2010-2017 (MADR, 2018). Le blé dur et l'orge dominent la sole avec respectivement 45 % et 29 % de la surface céréalière totale, pour une production agrégée de **41,2 millions de quintaux** en moyenne annuelle sur la même période. Malgré cette production, l'Algérie reste un importateur net de blé tendre, ce qui souligne l'importance d'optimiser les rendements des cultures existantes plutôt que de simplement étendre les superficies — une option géographiquement limitée.

La filière céréalière est particulièrement exposée aux risques phytosanitaires. Les principales menaces identifiées par l'Institut National de la Recherche Agronomique d'Algérie (INRAA) comprennent :

- **Maladies fongiques** : septoriose (*Septoria tritici*), rouille brune (*Puccinia triticina*), rouille jaune (*P. striiformis*), fusariose de l'épi (*Fusarium* spp.) ;
- **Ravageurs** : puceron des épis (*Sitobion avenae*), cécidomyie orange (*Sitodiplosis mosellana*), vers blancs (*Geotrupes* spp.) ;
- **Adventices** : avoine folle (*Avena sterilis*), ray-grass (*Lolium* spp.), moutarde sauvage (*Sinapis arvensis*).

Chacune de ces menaces requiert un ou plusieurs traitements au cours du cycle cultural, et la précision du dosage conditionne à la fois le résultat agronomique et la conformité réglementaire vis-à-vis des résidus de pesticides dans la récolte (Bouzerzour et al., 2016). Nous revenons sur ce point en §1.3.

---

## 1.3 La gestion phytosanitaire : un maillon critique sous-numérisé

### 1.3.1 Cadre réglementaire international et national

Les produits phytosanitaires (herbicides, fongicides, insecticides, régulateurs de croissance) sont des substances biologiquement actives dont l'utilisation est encadrée par un corpus réglementaire multiniveaux.

**Au niveau international**, l'Accord sur l'Application des Mesures Sanitaires et Phytosanitaires (Accord SPS) de l'Organisation Mondiale du Commerce, entré en vigueur en 1995, impose aux pays membres d'établir des mesures fondées sur des évaluations scientifiques des risques et proportionnées à l'objectif de protection (WTO, 1995). Le Codex Alimentarius, administré conjointement par la FAO et l'OMS, fixe les **Limites Maximales de Résidus (LMR)** pour chaque couple substance active/denrée alimentaire — limites que les pays exportateurs doivent respecter pour accéder aux marchés internationaux (FAO/OMS, 2021).

**Au niveau national**, le décret exécutif n° 95-405 du 2 décembre 1995, modifié et complété, réglemente l'homologation et l'utilisation des produits phytosanitaires en Algérie. Les exploitations soumises à des exigences de certification ou d'exportation doivent constituer et conserver un **registre de traitements phytosanitaires** conforme aux formulaires réglementaires **FOR.PR6.003** (fiche de traitement) et **FOR.PR6.004** (registre parcellaire). Pour chaque intervention, le registre doit mentionner (MADR, 2012) :

1. Le produit utilisé (nom commercial et matière active) ;
2. La dose appliquée (en L/ha ou kg/ha) ;
3. La parcelle traitée (identification, surface) ;
4. La date et l'heure du traitement ;
5. L'identité de l'opérateur ;
6. Les conditions météorologiques au moment de l'application (température, vent, humidité) ;
7. Le Délai Avant Récolte (DAR) prescrit et son respect effectif.

Ce registre n'est pas un document facultatif. Il peut être exigé lors d'un contrôle officiel de la Direction des Services Agricoles (DSA) ou lors d'un audit de certification. Sa tenue rigoureuse conditionne la capacité d'une exploitation à démontrer sa conformité phytosanitaire.

### 1.3.2 Les défaillances structurelles de la traçabilité manuelle

Dans la pratique quotidienne de la majorité des exploitations algériennes, ce registre est tenu **manuellement** — sur un cahier, sur des fiches papier, ou au mieux dans un tableur Excel rempli a posteriori. Nos observations de terrain sur le Domaine Khelifa, corroborées par la littérature (Mbow et al., 2017 ; Humphrey, 2000), permettent d'identifier trois catégories de défaillances systémiques.

#### 1.3.2.1 Erreurs de dosage en conditions réelles

La dose appliquée sur une parcelle dépend de trois variables physiques : le **débit du pulvérisateur** (L/min), la **largeur de la rampe** (m) et la **vitesse d'avancement du tracteur** (km/h). La relation est donnée par la formule classique :

> *Dose réelle (L/ha) = (Débit × 600) / (Largeur × Vitesse)*

En conditions réelles, la vitesse du tracteur n'est jamais constante. Elle varie avec le relief du terrain, les manœuvres en bout de rang, les changements de pente et l'état du sol (Doruchowski et al., 2009). Sur une parcelle de 20 hectares à relief modéré, nous avons mesuré des variations de vitesse de ±25 % par rapport à la consigne nominale, ce qui se traduit mécaniquement par des écarts de dosage du même ordre. Ces écarts produisent deux types de conséquences :

- **Sur-dosage** : gaspillage de produit (coût économique direct), risque de dépassement des LMR (non-conformité réglementaire), phytotoxicité potentielle sur la culture ;
- **Sous-dosage** : inefficacité du traitement, pression de sélection favorisant le développement de résistances aux matières actives chez les organismes cibles (Brent & Hollomon, 2007).

Sans capteur embarqué pour mesurer le débit et la vitesse en temps réel, ces écarts ne sont ni détectés ni corrigés. La Figure 1.2 illustre cette problématique.

> **Figure 1.2** — Schéma illustrant l'impact de la variation de vitesse du tracteur sur la dose réellement appliquée. À débit constant, un ralentissement produit un sur-dosage local, une accélération un sous-dosage. *Source : élaborée par les auteurs.*

#### 1.3.2.2 Perte de traçabilité documentaire

La saisie post-hoc du registre — effectuée après le traitement, sur la base de la mémoire de l'opérateur — est sujette à des défaillances bien documentées dans la littérature. Les erreurs typiques incluent les confusions entre parcelles (surtout lorsque plusieurs traitements sont effectués le même jour), les omissions de traitements jugés « mineurs » par l'opérateur, et les approximations sur les doses et les horaires (Humphrey, 2000).

Mbow et al. (2017) ont montré, dans le contexte des petits agriculteurs africains confrontés aux exigences SPS pour l'exportation, que les lacunes de traçabilité documentaire constituent l'une des **barrières non tarifaires les plus significatives** à l'accès aux marchés internationaux — au même titre que l'absence d'homologation des produits. Pour les exploitations algériennes qui visent la certification ou l'exportation, cette réalité n'est pas théorique : elle a des conséquences commerciales directes.

#### 1.3.2.3 Absence de supervision en temps réel

Un agronome ou un chef d'exploitation supervisant plusieurs équipements de traitement simultanément — situation courante dans les exploitations de taille moyenne à grande — ne dispose d'**aucune visibilité en temps réel** sur l'avancement des opérations. Il ne peut pas détecter pendant le traitement qu'une zone a été oubliée, qu'une autre a été traitée deux fois par chevauchement de passages, ou qu'un incident matériel (défaillance de buse, chute de pression) a compromis la qualité de l'application.

Cette absence de contrôle en cours d'opération rend impossible toute correction immédiate. L'agronome ne peut que constater les anomalies a posteriori — souvent trop tard pour y remédier sans un second passage coûteux. Le **Tableau 1.2** synthétise ces défaillances et leurs conséquences.

> **Tableau 1.2** — Synthèse des défaillances de la traçabilité manuelle et de leurs impacts

| Défaillance | Cause racine | Impact opérationnel | Impact réglementaire |
|---|---|---|---|
| Erreur de dosage | Absence de capteur de débit/vitesse | Sur-coût ou inefficacité | Risque de dépassement LMR |
| Perte de traçabilité | Saisie post-hoc de mémoire | Registre incomplet ou erroné | Non-conformité FOR.PR6 |
| Absence de supervision | Pas de remontée temps réel | Zones oubliées ou surdosées | Impossible à auditer |

### 1.3.3 L'enjeu de la certification et de l'accès aux marchés

La numérisation de la traçabilité phytosanitaire dépasse l'enjeu de l'efficacité opérationnelle interne. Elle conditionne de manière croissante l'accès à des marchés à plus haute valeur ajoutée.

Le référentiel **GLOBALG.A.P.** (Good Agricultural Practices), adopté par les grands distributeurs européens (Carrefour, Aldi, Tesco, Lidl) comme prérequis pour leurs fournisseurs de fruits, légumes et grandes cultures, impose une documentation rigoureuse et **auditable** de l'ensemble des pratiques culturales. Les points de contrôle relatifs à la protection des cultures (module CB, section 7) exigent notamment que les enregistrements de traitements soient « conservés, accessibles et vérifiables par un auditeur externe » (GLOBALG.A.P., 2023). Des registres manuscrits non structurés, sans horodatage vérifiable ni géolocalisation, ne satisfont pas à ces critères.

Pour le Domaine Khelifa, cet enjeu est concret et immédiat. Le **Groupe Lachhab**, acteur majeur de l'agroalimentaire dans l'Ouest algérien, a exprimé un intérêt pour l'acquisition de **50 unités** du système LeadFarm. Ce partenariat potentiel repose en partie sur la capacité de LeadFarm à fournir une traçabilité conforme aux exigences des clients du Groupe — qui peuvent eux-mêmes être soumis à des certifications de type GLOBALG.A.P. ou ISO 22000.

---

## 1.4 Problématique

L'analyse menée dans les sections précédentes fait apparaître une tension entre trois exigences convergentes mais techniquement difficiles à satisfaire simultanément dans le contexte algérien :

1. **Exigence métrologique** — Mesurer la dose réellement appliquée sur chaque point de la parcelle, ce qui suppose un instrument physique embarqué sur le tracteur, couplé à un système de géolocalisation.

2. **Exigence documentaire** — Produire automatiquement une traçabilité structurée, conforme aux formulaires réglementaires algériens (FOR.PR6.003/004) et auditable selon les standards internationaux (GLOBALG.A.P.).

3. **Exigence d'accessibilité** — Garantir le fonctionnement du système en zone rurale à connectivité mobile variable, sur des terminaux ordinaires (smartphones, tablettes), par des opérateurs non experts en informatique.

Les solutions existantes ne répondent pas à cette triple exigence dans sa totalité. Les plateformes internationales de FMIS sont conçues pour des contextes différents (cf. Chapitre 2 pour une analyse détaillée). Les systèmes IoT agricoles décrits dans la littérature académique restent majoritairement au stade de prototypes de laboratoire, sans validation en exploitation réelle (Tzounis et al., 2017 ; Elijah et al., 2018).

La problématique centrale du projet se formule donc ainsi :

> *Comment concevoir et développer une plateforme numérique combinant un module IoT embarqué sur tracteur, une cartographie dynamique des parcelles et un système d'aide à la décision agronomique, afin d'assurer simultanément le contrôle métrologique des traitements phytosanitaires en temps réel, leur traçabilité conforme aux exigences réglementaires algériennes, et leur accessibilité dans des conditions de connectivité rurale variable ?*

La contribution de LeadFarm réside précisément dans l'**intégration opérationnelle** de ces trois dimensions dans un système unique, conçu pour le contexte algérien et validé sur le terrain — par opposition aux approches partielles (capteur seul, logiciel seul) ou aux prototypes non déployés.

---

## 1.5 La numérisation agricole : de l'Agriculture 4.0 à l'Agriculture 5.0

### 1.5.1 Évolution par strates technologiques

Pour comprendre le positionnement de LeadFarm, il faut le situer dans la trajectoire plus large de la numérisation agricole. La littérature distingue généralement quatre grandes phases, même si les frontières entre elles ne sont pas toujours nettes (Zhai et al., 2020) :

- **Agriculture 1.0** — Pratiques traditionnelles, manuelles, traction animale. Aucun instrument de mesure embarqué.
- **Agriculture 2.0** — Mécanisation motrice (tracteur, moissonneuse) et usage systématique des intrants chimiques (engrais, pesticides). La productivité augmente fortement mais sans contrôle fin des applications.
- **Agriculture 3.0** — Introduction de l'électronique embarquée, du guidage GPS et des premiers systèmes d'agriculture de précision. Le tracteur sait où il est, mais les données restent locales (clé USB, carte SD).
- **Agriculture 4.0** — Connectivité IoT, cloud computing, télédétection (satellite, drone), systèmes d'information intégrés. Le champ est relié en temps réel au bureau de l'agronome.

Wolfert et al. (2017) définissent le *Smart Farming* comme « un développement qui souligne l'usage des technologies de l'information et de la communication dans le cycle cyber-physique de gestion agricole », et identifient l'IoT et le cloud computing comme les **principaux moteurs** de cette transformation. Cette définition capture bien l'ambition de LeadFarm : fermer la boucle entre le capteur terrain (monde physique) et le tableau de bord de l'agronome (monde numérique).

### 1.5.2 L'Agriculture 5.0 : la collaboration homme-machine comme paradigme

L'**Agriculture 5.0** prolonge cette trajectoire en dépassant la simple automatisation pour placer au centre la **collaboration entre l'intelligence humaine et l'intelligence artificielle** (Saiz-Rubio & Rovira-Más, 2020). Dans ce paradigme, l'IA ne remplace pas l'expert : elle l'informe, elle lui propose des recommandations, et c'est l'humain — avec sa connaissance du contexte local, de l'historique de ses parcelles, des particularités de son terroir — qui prend la décision finale et en assume la responsabilité.

C'est exactement le modèle de gouvernance que nous avons retenu pour LeadFarm. Quatre rôles collaborent dans le système :

1. Le **Consultant Expert** (agronome) formule les stratégies de traitement, définit les protocoles curatifs ou préventifs ;
2. Le **Responsable Technique** traduit ces stratégies en ordres opérationnels (date, parcelle, produit, dose) ;
3. L'**Opérateur** exécute les traitements sur le terrain, guidé par l'interface embarquée ;
4. Le **Système** mesure, enregistre, compare (dose prévue vs dose réelle) et alerte en cas d'anomalie.

Aucun acteur n'est éliminé. Chacun est **augmenté** par l'information en temps réel et par l'historique cumulé des opérations.

### 1.5.3 L'IoT agricole : maturité technologique et contraintes de déploiement

Sundmaeker et al. (2016) anticipaient dès 2016 que l'IoT transformerait les exploitations en « réseaux intelligents d'objets connectés, sensibles au contexte, identifiables, mesurables et contrôlables à distance ». Les briques technologiques nécessaires sont aujourd'hui matures : le protocole **MQTT** offre un transport de messages léger adapté aux connexions instables, les microcontrôleurs **ESP32** (Espressif Systems) intègrent WiFi, Bluetooth et capacité de calcul local à un coût inférieur à 5 USD, et les architectures serverless cloud permettent d'absorber des volumes croissants de données capteurs sans infrastructure propriétaire.

Toutefois, la littérature identifie un écart persistant entre les preuves de concept en laboratoire et les déploiements opérationnels en exploitation réelle (Tzounis et al., 2017). Les principaux obstacles sont :

- **Robustesse environnementale** : vibrations, poussière, humidité, température extrême pour les équipements embarqués sur tracteur ;
- **Connectivité** : couverture réseau mobile intermittente ou absente dans les zones rurales enclavées ;
- **Utilisabilité** : interfaces conçues par des ingénieurs pour des ingénieurs, peu adaptées à des opérateurs terrain non formés à l'informatique ;
- **Coût de déploiement** : ratio investissement/retour difficilement justifiable pour les petites exploitations.

La conception de LeadFarm intègre ces contraintes dès l'architecture initiale, à travers un mode hors ligne avec synchronisation différée (cf. Chapitre 3, §3.4), un boîtier ESP32 conforme à l'indice de protection IP54, et une interface utilisateur simplifiée conçue selon les principes du design universel (cf. Chapitre 4).

---

## 1.6 Objectifs spécifiques du projet

Conformément au sujet officiel de PFE déposé sous l'Arrêté ministériel n° 1275 dans le cadre du dispositif Diplôme-Startup, le projet se structure en sept objectifs spécifiques (OS) :

**OS1 — Cartographie numérique des parcelles.** Géoréférencer les parcelles de l'exploitation sur fond cartographique OpenStreetMap, les organiser en unités de gestion hiérarchisées (exploitation > zone > parcelle > micro-zone) et leur associer les métadonnées agronomiques pertinentes : culture, variété, surface mesurée, date de plantation, historique cultural et phytosanitaire.

**OS2 — Acquisition de données terrain via IoT.** Concevoir et réaliser un module embarqué à base d'ESP32, mesurant en temps réel les paramètres de pulvérisation (débit volumique, pression, position GPS, vitesse d'avancement) et calculant la dose appliquée par hectare. La communication avec le serveur utilise les protocoles MQTT et WebSocket, avec un **mode hors ligne** assurant le stockage local et la synchronisation différée.

**OS3 — Traçabilité réglementaire des traitements.** Enregistrer automatiquement, pour chaque opération de traitement, l'ensemble des données exigées par les formulaires FOR.PR6.003/004, et constituer un historique structuré, horodaté et géolocalisé, consultable en ligne et exportable (PDF conforme, CSV) pour les besoins de contrôle interne et d'audit externe.

**OS4 — Gestion centralisée du stock phytosanitaire.** Modéliser les flux d'entrées (approvisionnements) et de sorties (consommations par traitement), suivre les niveaux de stock par produit, les dates de péremption et les seuils d'alerte configurables, et anticiper les besoins d'approvisionnement sur la base des ordres de traitement planifiés.

**OS5 — Aide à la décision agronomique.** Fournir un tableau de bord synthétique intégrant des cartes thermiques d'application réelle (*as-applied heatmaps*), la détection automatique des anomalies de dosage (sur-dosage, sous-dosage, zones non traitées), et des recommandations contextualisées intégrant les données météorologiques (API OpenWeatherMap) et les stades phénologiques des cultures.

**OS6 — Robustesse, sécurité et conformité.** Implémenter un contrôle d'accès basé sur les rôles (RBAC) adapté aux quatre profils utilisateurs identifiés, sécuriser les échanges (HTTPS, authentification par token JWT), journaliser les accès et les modifications, et documenter la conformité aux référentiels qualité visés (GLOBALG.A.P., ISO 22000 en préparation).

**OS7 — Validation terrain et préparation à l'industrialisation.** Déployer un pilote opérationnel sur le Domaine Khelifa (Sidi Bel Abbès), mesurer les gains opérationnels (temps de saisie, taux d'erreur de traçabilité) et économiques (réduction du gaspillage de produit), et préparer la stratégie de mise à l'échelle dans le cadre du dispositif Diplôme-Startup (modèle SaaS, segmentation marché, structure tarifaire, business plan).

---

## 1.7 Démonstration lors de la soutenance

La soutenance s'appuie sur la démonstration en direct de quatre composants opérationnels fonctionnant de manière intégrée :

1. **Tableau de bord agronome (Application Web)** — Cartographie interactive des parcelles sur fond OpenStreetMap, vue temps réel des traitements en cours (position du tracteur, dose instantanée, couverture), module de planification des ordres de traitement, et génération automatique de rapports PDF conformes aux formulaires FOR.PR6.

2. **Module embarqué ESP32 (Hardware)** — Boîtier physique installé sur le tracteur ou le pulvérisateur, affichant en temps réel la position GPS, le débit instantané mesuré, la dose cumulée appliquée et les alertes de dépassement de seuil.

3. **Base de données et back-end** — Architecture relationnelle multi-rôles (PostgreSQL) couvrant l'ensemble des entités métier (exploitations, parcelles, produits, traitements, capteurs, utilisateurs), avec vues consolidées pour les tableaux de bord et API RESTful documentée.

4. **Module de gestion du stock phytosanitaire** — Suivi en temps réel des niveaux de stock par produit, alertes de péremption et de seuil minimal configurables par l'utilisateur.

Le **scénario de démonstration** suit un cas d'usage complet, de bout en bout : connexion de l'agronome → sélection d'une parcelle réelle du Domaine Khelifa → planification d'un traitement (produit, dose, parcelle) → démarrage du module ESP32 en mode acquisition → suivi en temps réel sur le tableau de bord → consultation de la traçabilité générée automatiquement → export du rapport PDF conforme FOR.PR6.

---

## 1.8 Conclusion

Ce premier chapitre a posé les fondations contextuelles et conceptuelles du projet LeadFarm.

Nous avons d'abord caractérisé le secteur agricole algérien : un secteur économiquement stratégique (11,6 % du PIB), employant une fraction importante de la population active, mais structurellement fragmenté (50 % des exploitations inférieures à 20 hectares) et confronté à une pression foncière croissante (0,22 ha/habitant). La wilaya de Sidi Bel Abbès, terrain d'étude du projet, est représentative de ce contexte, avec une céréaliculture dominante et un tissu d'exploitations moyennes potentiellement réceptives à la numérisation.

Nous avons ensuite analysé les défaillances de la gestion phytosanitaire manuelle selon trois dimensions : erreurs de dosage liées à l'absence de mesure embarquée, perte de traçabilité due à la saisie post-hoc, et impossibilité de supervision en temps réel. Ces défaillances ont des conséquences à la fois opérationnelles (gaspillage, inefficacité), réglementaires (non-conformité FOR.PR6) et commerciales (exclusion des marchés certifiés).

La problématique centrale du projet — concevoir une plateforme intégrée IoT + cartographie + aide à la décision adaptée aux contraintes algériennes — s'inscrit dans la trajectoire mondiale de l'Agriculture 4.0/5.0, tout en se distinguant par son exigence d'**intégration opérationnelle** et de **validation terrain**.

Le chapitre 2 dressera un état de l'art des solutions existantes — académiques et commerciales — et positionnera précisément la contribution de LeadFarm. Le chapitre 3 détaillera l'architecture technique conçue pour répondre à la problématique formulée ici.

---

## RÉFÉRENCES CITÉES DANS CE CHAPITRE

- Agri71. (2023). Vers un renouveau de l'agriculture algérienne ? *Agri71.fr*, 25 janvier 2023.
- agriculture.gouv.fr. (2022). Algérie : données agricoles et agroalimentaires. Ministère de l'Agriculture et de la Souveraineté Alimentaire (France).
- Bessaoud, O. (2019). L'agriculture algérienne : entre contraintes structurelles et impératifs de modernisation. *Cahiers du CREAD*, 35(2), 5–34.
- Bouzerzour, H., Djekoun, A., & Benmahammed, A. (2016). Amélioration des céréales en Algérie : acquis et perspectives. *Revue Agriculture*, ENSA Alger, 12, 15–28.
- Brent, K. J., & Hollomon, D. W. (2007). *Fungicide Resistance in Crop Pathogens: How Can It Be Managed?* (2nd ed.). FRAC Monograph No. 1. Croplife International.
- Chehat, F. (2008). La sécurité alimentaire en Algérie. *Revue Recherche Agronomique*, INRAA, 21, 1–12.
- Daoudi, A., Colin, J.-P., Derderi, A., & Ouendeno, M. L. (2015). Mise en valeur agricole et accès à la propriété foncière en steppe et au Sahara (Algérie). *Cahiers Agricultures*, 24(1), 82–90. https://doi.org/10.1684/agr.2015.0741
- Doruchowski, G., Świechowski, W., Godyn, A., & Holownicki, R. (2009). Automatically controlled sprayer to implement spray drift reducing application strategies in orchards. *Journal of Fruit and Ornamental Plant Research*, 17(2), 175–182.
- DSA Sidi Bel Abbès. (2020). *Rapport annuel — Campagne agricole 2019-2020.* Direction des Services Agricoles de la wilaya de Sidi Bel Abbès.
- Elijah, O., Rahman, T. A., Orikumhi, I., Leow, C. Y., & Hindia, M. N. (2018). An Overview of Internet of Things (IoT) and Data Analytics in Agriculture. *Sensors*, 18(8), 2838. https://doi.org/10.3390/s18082838
- FAO. (2022). *Guide to develop and strengthen national pesticide residue monitoring programmes.* Bangkok : FAO. https://openknowledge.fao.org/server/api/core/bitstreams/67ab0f3b/content
- FAO/OMS. (2021). *Codex Alimentarius — Pesticide Residues in Food.* Commission du Codex Alimentarius.
- Fountas, S., Sorensen, C. G., Tsiropoulos, Z., Cavalaris, C., Liakos, V., & Gemtos, T. (2015). Farm machinery management information system. *Computers and Electronics in Agriculture*, 110, 131–138. https://doi.org/10.1016/j.compag.2014.11.011
- GLOBALG.A.P. (2023). *Integrated Farm Assurance — Crops Base Module, Version 6.* Cologne : GLOBALG.A.P. c/o FoodPLUS GmbH.
- Humphrey, J. (2000). Strategies for Diversification and Adding Value to Food Exports: A Value Chain Perspective. *IDS Bulletin*, 31(1).
- Kamilaris, A., Kartakoullis, A., & Prenafeta-Boldú, F. X. (2017). A review on the practice of big data analysis in agriculture. *Computers and Electronics in Agriculture*, 143, 23–37. https://doi.org/10.1016/j.compag.2017.09.037
- MADR. (2012). *Formulaires de traçabilité phytosanitaire FOR.PR6.003/004.* Ministère de l'Agriculture et du Développement Rural, Alger.
- MADR. (2018). *Statistiques agricoles — Superficies et productions, série 2010-2017.* Ministère de l'Agriculture et du Développement Rural, Alger. https://fr.madr.gov.dz/statistiques-agricoles/
- Mbow, C., Rosenzweig, C., Barioni, L. G., et al. (2017). Food Security. In *IPCC Special Report on Climate Change and Land* (pp. 437–550). IPCC.
- ONS. (2023). *Comptes économiques — PIB par secteur d'activité, 2022.* Office National des Statistiques, Alger.
- Réseau-FAR. (s.d.). Algérie — Données agricoles. https://www.reseau-far.com/algerie/
- Saiz-Rubio, V., & Rovira-Más, F. (2020). From Smart Farming towards Agriculture 5.0: A Review on Crop Data Management. *Agronomy*, 10(2), 207. https://doi.org/10.3390/agronomy10020207
- Sundmaeker, H., Verdouw, C. N., Wolfert, J., & Perez Freire, L. (2016). Internet of Food and Farm 2020. In O. Vermesan & P. Friess (Eds.), *Digitising the Industry: Internet of Things Connecting the Physical, Digital and Virtual Worlds* (pp. 129–150). River Publishers. https://doi.org/10.1201/9781003337966-4
- Tzounis, A., Katsoulas, N., Bartzanas, T., & Kittas, C. (2017). Internet of Things in agriculture, recent advances and future challenges. *Biosystems Engineering*, 164, 31–48. https://doi.org/10.1016/j.biosystemseng.2017.09.007
- Wolfert, S., Ge, L., Verdouw, C., & Bogaardt, M. J. (2017). Big Data in Smart Farming – A review. *Agricultural Systems*, 153, 69–80. https://doi.org/10.1016/j.agsy.2017.01.023
- WTO. (1995). *Agreement on the Application of Sanitary and Phytosanitary Measures (SPS Agreement).* World Trade Organization. https://www.wto.org/english/tratop_e/sps_e/spsund_e.htm
- Zhai, Z., Martínez, J. F., Beltran, V., & Martínez, N. L. (2020). Decision support systems for agriculture 4.0: Survey and challenges. *Computers and Electronics in Agriculture*, 170, 105256. https://doi.org/10.1016/j.compag.2020.105256
