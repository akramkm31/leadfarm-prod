# CHAPITRE 1 — CONTEXTE ET PROBLÉMATIQUE

> **Note de travail (à retirer avant dépôt).** Les marqueurs `[🔧]` indiquent les données à compléter avec tes chiffres réels. Les références citées sont vérifiées. N'ajoute à la bibliographie finale que les sources que tu as effectivement consultées.

---

## 1.1 Introduction

Ce chapitre pose le cadre général dans lequel s'inscrit LeadFarm. Nous commençons par caractériser le secteur agricole algérien et sa place dans l'économie nationale (§1.2), avant d'analyser les contraintes structurelles de la gestion phytosanitaire dans les exploitations (§1.3). Nous articulons ensuite la problématique centrale (§1.4), avant de positionner le projet par rapport à la trajectoire de numérisation agricole mondiale (§1.5) et d'énoncer les objectifs spécifiques (§1.6).

---

## 1.2 L'agriculture algérienne : enjeux et structure

### 1.2.1 Poids économique et stratégique

L'agriculture occupe une place structurelle dans l'économie algérienne. Selon les données du Ministère de l'Agriculture et du Développement Rural (MADR) et de la FAO, le secteur contribue à hauteur de **11,6 % du PIB** en 2022 et emploie une fraction significative de la population active rurale. La Surface Agricole Utile (SAU) atteint **8,5 millions d'hectares**, dont 7,5 millions de terres arables, représentant 20 % de la Surface Agricole Totale d'un pays dont le territoire s'étend sur 2,38 millions de km² (Réseau-FAR / MADR ; agriculture.gouv.fr, 2022). Ces chiffres révèlent d'emblée la première contrainte du secteur : une pression foncière considérable, avec seulement 0,22 hectare de SAU par habitant contre 0,73 en 1962.

Face à cette réalité, l'autosuffisance alimentaire constitue un axe prioritaire de la politique nationale. Le projet de loi de finances 2023 a mobilisé 700 milliards de dinars algériens en soutien aux filières agricoles, avec des objectifs de croissance sectorielle de 6,9 % en 2023 et 5,5 % en 2024 (Agri71, 2023). Dans ce contexte, la modernisation des pratiques de production — et notamment la maîtrise des intrants phytosanitaires — n'est pas une démarche volontaire mais une condition de compétitivité.

### 1.2.2 Structure des exploitations

La caractéristique structurante du tissu agricole algérien est sa **fragmentation**. Les statistiques du MADR dénombrent 1 198 057 exploitations agricoles, dont **50 % ont moins de 20 hectares** et **26 % moins de 10 hectares**. Cette atomisation a des conséquences directes sur la numérisation : les grandes plateformes de *Farm Management* internationales ciblent des exploitations intensives dépassant plusieurs centaines d'hectares et ne sont ni économiquement accessibles ni fonctionnellement adaptées à la réalité algérienne.

À l'opposé de ce tissu fragmenté, un segment d'exploitations moyennes et grandes — dont le Domaine Khelifa (Sidi Bel Abbès) constitue un représentant — dispose des moyens et de la motivation pour adopter des outils numériques, à condition que ceux-ci soient conçus pour leurs contraintes spécifiques : connectivité mobile variable, paiement en DZD, interface bilingue français-arabe.

[🔧 Ajoute ici quelques données sur Sidi Bel Abbès comme région agricole si disponibles — superficie, cultures dominantes, wilaya.]

### 1.2.3 La céréaliculture comme filière de référence

[🔧 Adapte cette sous-section à la culture réelle du Domaine Khelifa. Si c'est une autre culture que les céréales, réécris en conséquence.]

La céréaliculture représente 40 % de la SAU en moyenne annuelle sur la période 2010-2017 (MADR, 2018), avec le blé dur et l'orge occupant 74 % de la sole céréalière totale. La production réalisée atteint 41,2 millions de quintaux en moyenne sur cette période. Cette filière est particulièrement concernée par la gestion phytosanitaire : les maladies fongiques (septoriose, rouilles, fusariose), les ravageurs et les adventices nécessitent des traitements réguliers dont la précision de dosage conditionne à la fois l'efficacité agronomique et la conformité réglementaire.

---

## 1.3 La gestion phytosanitaire : un maillon critique sous-numérisé

### 1.3.1 Définition et enjeux réglementaires

Les produits phytosanitaires désignent l'ensemble des substances utilisées pour protéger les végétaux contre les organismes nuisibles (insectes, champignons, bactéries, mauvaises herbes). Leur usage est encadré par des réglementations nationales et internationales : l'Accord SPS de l'Organisation Mondiale du Commerce impose aux pays membres d'établir des mesures sanitaires et phytosanitaires fondées sur des évaluations scientifiques du risque (WTO, 1995). La FAO souligne que dans la quasi-totalité des pays, l'usage des pesticides est réglementé et conditionné à une homologation préalable, les autorités compétentes fixant des Limites Maximales de Résidus (LMR) pour les denrées alimentaires (FAO, 2022).

En Algérie, les exploitations soumises à des exigences de certification ou d'export doivent constituer et conserver un registre de traitements phytosanitaires conforme aux formulaires réglementaires **FOR.PR6.003/004**, mentionnant pour chaque intervention : le produit utilisé, la dose appliquée, la parcelle traitée, la date, l'opérateur, les conditions météorologiques au moment de l'application, et le délai avant récolte (DAR) respecté.

### 1.3.2 Les limites de la traçabilité manuelle

Dans la grande majorité des exploitations algériennes, la tenue de ce registre demeure **manuelle ou semi-manuelle**. Cette pratique présente des défaillances structurelles identifiées en trois catégories :

**Erreurs de dosage.** La dose appliquée est traditionnellement calculée à partir de la dose prescrite et d'une estimation de la surface parcellaire, sans mesure physique du débit ni de la vitesse d'avancement du tracteur. En conditions réelles, la vitesse variable du tracteur (terrain accidenté, manœuvres en bout de rang) entraîne des écarts systématiques entre la dose prévue et la dose réellement délivrée. Ces écarts se traduisent soit par un **sur-dosage** (gaspillage de produit, risque de résidus excessifs, coût économique) soit par un **sous-dosage** (inefficacité du traitement, résistance aux matières actives).

**Perte de traçabilité.** La saisie post-hoc, effectuée après le traitement sur la base des souvenirs de l'opérateur, est sujette aux omissions, aux confusions entre parcelles et aux erreurs de transcription. L'étude de Mbow et al. (2017) sur la conformité des petits agriculteurs africains aux mesures SPS identifie explicitement les exigences de traçabilité comme l'une des principales contraintes à l'accès aux marchés d'exportation, au même titre que l'homologation des pesticides.

**Absence de contrôle en temps réel.** Un agronome supervisant plusieurs tracteurs simultanément ne dispose d'aucune visibilité sur l'avancement réel des traitements ni sur les anomalies d'application (zones traitées deux fois, zones oubliées, incidents matériels). Cette absence de supervision temps réel rend impossible la correction en cours de traitement.

### 1.3.3 L'enjeu de la certification et de l'export

La numérisation de la traçabilité phytosanitaire n'est pas seulement une question d'efficacité opérationnelle : elle conditionne l'accès à des marchés à plus haute valeur ajoutée. Le référentiel **GLOBALG.A.P.**, standard d'assurance de l'exploitation agricole intégrée adopté par les grands distributeurs européens, exige une documentation rigoureuse et auditable de l'ensemble des pratiques agricoles, incluant la traçabilité des traitements et le respect des intervalles avant récolte. Les enregistrements doivent être conservés et consultables par des auditeurs externes, ce qui exclut de facto les registres manuscrits non structurés.

Dans ce contexte, la capacité du Domaine Khelifa à accéder à des contrats avec Groupe Lachhab — qui exprime un intérêt pour 50 unités — dépend en partie de sa capacité à démontrer une traçabilité conforme, auprès de clients qui eux-mêmes peuvent être soumis à des exigences d'acheteurs finaux.

---

## 1.4 Problématique

L'analyse du contexte fait apparaître une tension entre trois exigences convergentes mais techniquement difficiles à satisfaire simultanément dans le contexte algérien :

1. **Mesure métrologique** de la dose réellement appliquée, impossible sans instrument embarqué sur le tracteur.
2. **Traçabilité réglementaire** structurée et auditable, impossible sans système de gestion centralisé.
3. **Accessibilité terrain**, c'est-à-dire fonctionnement en zone rurale à connectivité variable, sur des appareils ordinaires, par des opérateurs non experts en informatique.

Cette triple exigence formule la problématique centrale :

> *Comment concevoir et développer une plateforme numérique combinant un module IoT embarqué sur tracteur, une cartographie dynamique des parcelles et un système d'aide à la décision agronomique, afin d'assurer simultanément le contrôle métrologique des traitements phytosanitaires en temps réel, leur traçabilité conforme aux exigences réglementaires algériennes, et leur accessibilité dans des conditions de connectivité rurale variable ?*

Les solutions existantes ne répondent pas à cette problématique dans sa totalité. Les plateformes internationales de *Smart Farming* (cf. Chapitre 2) sont conçues pour des contextes bien connectés, facturées en devises étrangères, et ne prennent pas en charge les formulaires réglementaires algériens. Les systèmes IoT agricoles publiés dans la littérature académique restent des prototypes de laboratoire non déployés en exploitation réelle. La contribution de LeadFarm est précisément l'**intégration** de ces dimensions dans un système opérationnel validé sur le terrain.

---

## 1.5 La numérisation agricole : de l'Agriculture 4.0 à l'Agriculture 5.0

### 1.5.1 Les stades de la révolution numérique agricole

La transformation numérique de l'agriculture s'est produite par strates successives. L'**Agriculture 1.0** désigne les pratiques traditionnelles manuelles et animales. L'**Agriculture 2.0** correspond à la mécanisation et à l'usage des intrants chimiques (engrais, pesticides). L'**Agriculture 3.0** introduit l'électronique, le guidage GPS et les premières automatisations. L'**Agriculture 4.0**, concept central depuis la fin des années 2010, mobilise l'Internet des Objets, le *cloud computing*, la télédétection et les systèmes d'information pour connecter le champ à la décision agronomique (Wolfert et al., 2017 ; Sundmaeker et al., 2016).

Wolfert et al. (2017) définissent le *Smart Farming* comme « un développement qui souligne l'usage des technologies de l'information et de la communication dans le cycle cyber-physique de gestion agricole », et identifient l'IoT et le *cloud computing* comme les principaux moteurs de cette transformation. Ces technologies permettent de collecter des données à la source (capteurs terrain), de les transmettre en temps réel, et de les exploiter pour produire des recommandations actionnables.

### 1.5.2 L'Agriculture 5.0 : la collaboration homme-machine

L'**Agriculture 5.0** prolonge cette trajectoire en dépassant la simple automatisation pour mettre l'accent sur la **collaboration entre l'intelligence humaine et l'intelligence artificielle**. Dans ce paradigme, l'expert agronomique et le système informatique sont co-décideurs : l'IA produit des recommandations, l'agronome les valide, enrichit de son expertise contextuelle et assume la responsabilité finale.

C'est précisément le modèle de gouvernance de LeadFarm : le Consultant Expert émet des directives agronomiques (protocoles curatifs ou préventifs) que le Responsable Technique traduit en ordres opérationnels, pendant que l'Opérateur exécute sur le terrain et que le système mesure, trace et alerte en temps réel. Aucun acteur n'est remplacé ; chacun est augmenté par l'information.

### 1.5.3 L'IoT comme brique fondatrice

Sundmaeker et al. (2016) anticipaient dès 2016 que l'IoT transformerait les exploitations en « réseaux intelligents d'objets connectés, sensibles au contexte, identifiables, mesurables et contrôlables à distance ». Cette vision se concrétise à travers des protocoles comme MQTT, des microcontrôleurs comme l'ESP32 et des plateformes *backend* capables d'ingérer des flux massifs de données capteurs.

Le défi spécifique de l'IoT agricole est la **robustesse dans des environnements contraints** : couverture réseau intermittente, vibrations et poussière pour les équipements embarqués, opérateurs terrain non techniciens. La conception de LeadFarm prend explicitement en charge ces contraintes (cf. Chapitres 3 et 4).

---

## 1.6 Objectifs spécifiques du projet

Conformément au sujet officiel de PFE déposé sous l'Arrêté ministériel n° 1275 (Diplôme-Startup), le projet se décline en sept objectifs spécifiques (OS) :

**OS1 — Cartographie numérique des parcelles.** Géoréférencer les parcelles sur fond cartographique OpenStreetMap, les découper en unités de gestion (zones, parcelles, micro-zones) et leur associer leurs métadonnées agronomiques (culture, surface, variété, date de plantation, historique cultural).

**OS2 — Acquisition de données terrain via IoT.** Concevoir un module embarqué ESP32 mesurant en temps réel les paramètres de pulvérisation (débit, pression, géolocalisation, dose appliquée), communiquant via MQTT et WebSocket, avec un mode hors ligne adapté aux zones rurales à connectivité limitée.

**OS3 — Traçabilité des traitements phytosanitaires.** Enregistrer pour chaque traitement les informations réglementaires requises par les formulaires FOR.PR6.003/004 et constituer un historique consultable et exportable (PDF, CSV) pour les contrôles internes et externes.

**OS4 — Gestion centralisée du stock phytosanitaire.** Modéliser les flux d'entrées et de sorties, suivre les niveaux de stock, les dates de péremption et les seuils d'alerte, et anticiper les besoins sur la base des ordres planifiés.

**OS5 — Aide à la décision agronomique.** Fournir un tableau de bord synthétique incluant des cartes thermiques d'application (*as-applied heatmaps*), la détection automatique des anomalies de dosage, et des recommandations intégrant les données météorologiques et phénologiques.

**OS6 — Robustesse, sécurité et conformité.** Mettre en place une architecture multi-utilisateurs avec contrôle d'accès basé sur les rôles (RBAC), sécuriser les données par authentification, journalisation des accès et chiffrement des communications, et documenter la conformité aux référentiels qualité visés (GLOBALG.A.P.).

**OS7 — Validation terrain et industrialisation.** Déployer un pilote opérationnel sur le Domaine Khelifa (Sidi Bel Abbès), mesurer les gains opérationnels et économiques, et préparer la stratégie de mise à l'échelle dans le cadre du dispositif Diplôme-Startup (modèle SaaS, segmentation marché, business plan).

---

## 1.7 Démonstration lors de la soutenance

La soutenance s'articule autour de quatre composants opérationnels démontrés en direct :

1. **Tableau de bord agronome (Web)** — cartographie interactive des parcelles, vue temps réel des traitements, module de planification, génération automatique de rapports PDF.
2. **Module embarqué ESP32 (Hardware)** — boîtier installé sur tracteur ou pulvérisateur, affichant en direct la position GPS, le débit instantané et la dose appliquée.
3. **Base de données et back-end** — structure relationnelle multi-rôles couvrant l'ensemble des entités métier, avec vues consolidées pour les tableaux de bord.
4. **Module de gestion du stock** — suivi temps réel des produits phytosanitaires, alertes de péremption et seuils minimaux.

Le scénario de démonstration suit un cas d'usage bout en bout : connexion de l'agronome, sélection d'une parcelle réelle, planification d'un traitement, démarrage du module ESP32, consultation de la traçabilité générée et export PDF conforme FOR.PR6.

---

## 1.8 Conclusion

Ce premier chapitre a établi le contexte dans lequel s'inscrit LeadFarm : un secteur agricole algérien économiquement stratégique mais structurellement fragmenté, une gestion phytosanitaire encore largement manuelle dont les limites sont documentées (erreurs de dosage, traçabilité incomplète, absence de supervision temps réel), et une trajectoire mondiale de numérisation agricole — du Smart Farming 4.0 à la collaboration homme-machine 5.0 — qui offre les technologies pour y répondre.

La problématique centrale — concevoir une plateforme intégrée IoT + cartographie + aide à la décision adaptée aux contraintes algériennes — détermine l'ensemble des choix de conception développés dans les chapitres suivants. Le chapitre 2 dresse l'état de l'art des solutions existantes et positionne la contribution de LeadFarm. Le chapitre 3 détaille l'architecture conçue pour répondre à cette problématique.

---

## RÉFÉRENCES CITÉES DANS CE CHAPITRE

> Vérifiées à la rédaction. À intégrer dans la bibliographie générale (classement alphabétique).

- Agri71. (2023). *Vers un renouveau de l'agriculture algérienne ?* https://www.agri71.fr/articles/25/01/2023/...
- agriculture.gouv.fr. (2022). *Algérie : données agricoles et agroalimentaires.* Ministère de l'Agriculture et de la Souveraineté Alimentaire (France).
- FAO. (2022). *Guide to develop and strengthen national pesticide residue monitoring programmes.* Bangkok : FAO. https://openknowledge.fao.org/server/api/core/bitstreams/67ab0f3b/content
- Mbow, C., et al. (2017). Food security. In *IPCC Special Report on Climate Change and Land.* [🔧 Remplacer par la référence exacte sur la conformité SPS africaine que tu as utilisée, ou utiliser : Humphrey, J., & Oetero, A. (2000). *Strategies for Diversification and Adding Value to Food Exports: A Value Chain Perspective.* IDS Bulletin.]
- MADR. (2018). *Statistiques agricoles — Superficies et productions.* Ministère de l'Agriculture et du Développement Rural, Alger. https://fr.madr.gov.dz/statistiques-agricoles/
- Réseau-FAR. (s.d.). *Algérie — Données agricoles.* https://www.reseau-far.com/algerie/
- Sundmaeker, H., Verdouw, C. N., Wolfert, J., & Perez Freire, L. (2016). Internet of Food and Farm 2020. In O. Vermesan & P. Friess (Eds.), *Digitising the Industry: Internet of Things Connecting the Physical, Digital and Virtual Worlds* (pp. 129–150). River Publishers. https://doi.org/10.1201/9781003337966-4
- Wolfert, S., Ge, L., Verdouw, C., & Bogaardt, M. J. (2017). Big Data in Smart Farming – A review. *Agricultural Systems*, 153, 69–80. https://doi.org/10.1016/j.agsy.2017.01.023
- WTO. (1995). *Agreement on the Application of Sanitary and Phytosanitary Measures (SPS Agreement).* World Trade Organization. https://www.wto.org/english/tratop_e/sps_e/spsund_e.htm
