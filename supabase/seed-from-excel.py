"""
Extracts data from GESTION DU STOCK SBA 2025 Excel file
and generates SQL INSERT statements for Supabase.
"""
import pandas as pd
import uuid
import re
from datetime import datetime

EXCEL_PATH = r"C:\Users\User\Downloads\GESTION DU STOCK SBA 2025 (1).xlsx"
OUTPUT_PATH = r"C:\Users\User\Desktop\projet\lead farm final\supabase\migrations\002_seed.sql"

xls = pd.ExcelFile(EXCEL_PATH)

def esc(val):
    if pd.isna(val) or val is None or str(val).strip() in ('', '/', '(vide)', 'NaN'):
        return 'NULL'
    s = str(val).strip().replace("'", "''")
    return f"'{s}'"

def esc_num(val):
    if pd.isna(val) or val is None or str(val).strip() in ('', '/', '(vide)'):
        return 'NULL'
    try:
        return str(float(val))
    except:
        return 'NULL'

def map_category(cat):
    if pd.isna(cat) or cat is None:
        return 'autre'
    cat = str(cat).strip().upper()
    mapping = {
        'FONGICIDE': 'fongicide',
        'INSECTICIDE': 'insecticide',
        'HERBICIDE': 'herbicide',
        'ENGRAIS': 'engrais',
        'ADJUVANT': 'adjuvant',
        'ACARICIDE': 'acaricide',
        'ACIDE NITRIQUE': 'acide_nitrique',
        'ACIDE SULFURIQUE': 'acide_sulfurique',
        'ACIDE PHOSPHORIQUE': 'acide_phosphorique',
        'ACIDE HUMIQUE': 'acide_humique',
        'MATIERE ORGANIQUE': 'matiere_organique',
        'FER': 'fer',
        'DRMX': 'drmx',
        'AUTRE': 'autre',
    }
    return mapping.get(cat, 'autre')

def map_culture(cult):
    if pd.isna(cult) or cult is None:
        return None
    cult = str(cult).strip().upper()
    mapping = {
        'A PEPINS': 'a_pepins',
        'A NOYAU': 'a_noyau',
        'VIGNE': 'vigne',
        'AGRUMES': 'agrumes',
        'TT': 'autre',
        'ZEGLA': 'autre',
        '/': None,
    }
    return mapping.get(cult, 'autre')

def safe_float(val):
    if pd.isna(val) or val is None:
        return 0
    try:
        return float(val)
    except (ValueError, TypeError):
        return 0

def map_movement_type(row):
    transfert = safe_float(row.get(10))
    entrees = safe_float(row.get(11))
    retours = safe_float(row.get(12))
    sorties = safe_float(row.get(13))

    if transfert > 0:
        return 'transfert', transfert
    if entrees > 0:
        return 'entree', entrees
    if retours > 0:
        return 'retour', retours
    if sorties > 0:
        return 'sortie', sorties
    return 'sortie', 0

sql_lines = []
sql_lines.append("-- ============================================================")
sql_lines.append("-- LeadFarm Seed Data — Generated from GESTION DU STOCK SBA 2025")
sql_lines.append(f"-- Generated: {datetime.now().isoformat()}")
sql_lines.append("-- ============================================================\n")

# ============================================================
# 1. EXPLOITATION
# ============================================================
exploitation_id = str(uuid.uuid4())
sql_lines.append("-- Exploitation")
sql_lines.append(f"""INSERT INTO exploitations (id, name, wilaya, commune, site, subscription_plan)
VALUES ('{exploitation_id}', 'Domaine SBA', 'Sidi Bel Abbes', 'SBA', 'Multi-sites', 'enterprise');
""")

# ============================================================
# 2. SUPPLIERS (from ENTREES sheet)
# ============================================================
df_entrees = pd.read_excel(xls, sheet_name='ENTREES', header=None)
fabricants = set()
distributeurs = set()

for _, row in df_entrees.iloc[3:].iterrows():
    fab = str(row[4]).strip() if not pd.isna(row[4]) else ''
    dist = str(row[5]).strip() if not pd.isna(row[5]) else ''
    if fab and fab not in ('', '(vide)', '/'):
        fabricants.add(fab)
    if dist and dist not in ('', '(vide)', '/'):
        distributeurs.add(dist)

supplier_ids = {}
sql_lines.append("\n-- Suppliers (Fabricants)")
for name in sorted(fabricants):
    sid = str(uuid.uuid4())
    supplier_ids[name] = sid
    sql_lines.append(f"INSERT INTO suppliers (id, name, role) VALUES ('{sid}', {esc(name)}, 'fabricant');")

sql_lines.append("\n-- Suppliers (Distributeurs)")
for name in sorted(distributeurs):
    sid = str(uuid.uuid4())
    supplier_ids[name] = sid
    sql_lines.append(f"INSERT INTO suppliers (id, name, role) VALUES ('{sid}', {esc(name)}, 'distributeur');")

# ============================================================
# 3. PRODUCTS (from RESTE AUTO + MOUVEMENT sheets)
# ============================================================
df_reste = pd.read_excel(xls, sheet_name='RESTE AUTO', header=None)
df_mouv = pd.read_excel(xls, sheet_name='MOUVEMENT ', header=None)

# Build product info from MOUVEMENT (richer data)
product_info = {}
for _, row in df_mouv.iloc[12:].iterrows():
    pname = str(row[2]).strip() if not pd.isna(row[2]) else ''
    if not pname or pname == '/':
        continue
    if pname not in product_info:
        product_info[pname] = {
            'category': map_category(row[1]),
            'active_substance': str(row[3]).strip() if not pd.isna(row[3]) else None,
            'teneur_ma': str(row[4]).strip() if not pd.isna(row[4]) else None,
            'formulation': str(row[5]).strip() if not pd.isna(row[5]) else None,
            'famille_chimique': str(row[6]).strip() if not pd.isna(row[6]) else None,
            'dose': str(row[7]).strip() if not pd.isna(row[7]) else None,
            'cible': str(row[8]).strip() if not pd.isna(row[8]) else None,
            'stock_initial': float(row[9]) if not pd.isna(row[9]) else 0,
            'dar': str(row[17]).strip() if not pd.isna(row[17]) else None,
        }

# Add products from RESTE AUTO that might not be in MOUVEMENT
for _, row in df_reste.iloc[3:].iterrows():
    pname = str(row[1]).strip() if not pd.isna(row[1]) else ''
    if not pname or pname == '/':
        continue
    cat = map_category(row[0])
    if pname not in product_info:
        product_info[pname] = {
            'category': cat,
            'active_substance': str(row[2]).strip() if not pd.isna(row[2]) else None,
            'teneur_ma': None,
            'formulation': None,
            'famille_chimique': None,
            'dose': None,
            'cible': None,
            'stock_initial': 0,
            'dar': None,
        }

product_ids = {}
sql_lines.append(f"\n-- Products ({len(product_info)} total)")
for pname, info in sorted(product_info.items()):
    pid = str(uuid.uuid4())
    product_ids[pname] = pid
    cat = info['category']
    unit = 'kg' if info.get('formulation') in ('Kg', 'kg', 'WP', 'WG', 'GR') else 'L'
    dar_val = 'NULL'
    if info['dar'] and info['dar'] not in ('/', ''):
        try:
            dar_val = str(int(float(info['dar'])))
        except:
            dar_val = 'NULL'

    sql_lines.append(
        f"INSERT INTO products (id, trade_name, category, active_substance, teneur_ma, "
        f"formulation, famille_chimique, dose, cible, unit, dar, stock_initial_2024) "
        f"VALUES ('{pid}', {esc(pname)}, '{cat}', {esc(info['active_substance'])}, "
        f"{esc(info['teneur_ma'])}, {esc(info['formulation'])}, {esc(info['famille_chimique'])}, "
        f"{esc(info['dose'])}, {esc(info['cible'])}, '{unit}', {dar_val}, {esc_num(info['stock_initial'])});"
    )

# ============================================================
# 4. PARCELLES: Regions → Zones → Sites
# ============================================================
df_parc = pd.read_excel(xls, sheet_name='PARCELLES', header=None)

regions_data = {
    'TENIRA': {'culture': 'a_pepins', 'zones': {
        'A PEPINS TENIRA': ['13HA LA BASE', 'LA BASE', '28HA', 'HAJA FATMA GRANDE', 'HAJA FATMA PETITE', 'HOUARI BOUGARA', 'HOUARI HAJA FATMA', 'ALIAOUI'],
        'A PEPINS LYCEE': ['A PEPINS LYCEE'],
        'A PEPINS HJIRA': ['HJIRA GRANDE', 'HJIRA PETITE'],
        'A PEPINS MAGUER': ['MAGUER GRANDE', 'MAGUER PETITE 24Ha'],
    }},
    'SEFYOUN': {'culture': 'a_pepins', 'zones': {
        'A PEPINS SEFYOUN': ['A PEPINS SEFYOUN'],
    }},
    'MEZAOUROU': {'culture': 'a_pepins', 'zones': {
        'POIRIER MEZAOUROU': ['POIRIER MEZAOUROU'],
    }},
    'SIDIHMAD': {'culture': 'a_noyau', 'zones': {
        'A NOYAU SIDIHMAD': ['A NOYAU SIDIHMAD'],
    }},
    'KOUANKA': {'culture': 'a_noyau', 'zones': {
        'A NOYAU KOUANKA': ['A NOYAU KOUANKA'],
    }},
    'SYS V': {'culture': 'a_noyau', 'zones': {
        'A NOYAU SYS V': ['A NOYAU SYS V'],
    }},
    'MAGUER AN': {'culture': 'a_noyau', 'zones': {
        'A NOYAU MAGUER': ['A NOYAU MAGUER'],
    }},
    'TIRMANE': {'culture': 'a_noyau', 'zones': {
        'A NOYAU TIRMANE': ['A NOYAU 44HA', 'A NOYAU 18HA', 'A NOYAU MEZAOUROU', 'A NOYAU NV 40HA', 'A NOYAU TIRMANE'],
        'VIGNE TIRMANE': ['VIGNE ROUMILIYA', 'VIGNE 25Ha TIRMANE'],
    }},
}

region_ids = {}
zone_ids = {}
site_ids = {}

sql_lines.append(f"\n-- Regions")
for rname in regions_data:
    rid = str(uuid.uuid4())
    region_ids[rname] = rid
    sql_lines.append(f"INSERT INTO regions (id, name) VALUES ('{rid}', {esc(rname)});")

sql_lines.append(f"\n-- Zones")
for rname, rdata in regions_data.items():
    for zname in rdata['zones']:
        zid = str(uuid.uuid4())
        zone_ids[zname] = zid
        cult = rdata['culture']
        # Special case: vigne zones
        if 'VIGNE' in zname.upper():
            cult = 'vigne'
        sql_lines.append(f"INSERT INTO zones (id, name, region_id, culture_type) VALUES ('{zid}', {esc(zname)}, '{region_ids[rname]}', '{cult}');")

sql_lines.append(f"\n-- Sites")
for rname, rdata in regions_data.items():
    for zname, site_list in rdata['zones'].items():
        for sname in site_list:
            sid = str(uuid.uuid4())
            site_ids[sname] = sid
            sql_lines.append(f"INSERT INTO sites (id, name, zone_id) VALUES ('{sid}', {esc(sname)}, '{zone_ids[zname]}');")

# ============================================================
# 5. MOVEMENTS (6915 rows from MOUVEMENT sheet)
# ============================================================
sql_lines.append(f"\n-- Movements ({len(df_mouv) - 12} rows)")
movement_count = 0
for idx, row in df_mouv.iloc[12:].iterrows():
    date_val = row[0]
    if pd.isna(date_val):
        continue
    try:
        if isinstance(date_val, str):
            date_str = date_val[:10]
        else:
            date_str = pd.Timestamp(date_val).strftime('%Y-%m-%d')
    except:
        continue

    pname = str(row[2]).strip() if not pd.isna(row[2]) else ''
    if not pname or pname == '/':
        continue

    pid = product_ids.get(pname)
    if not pid:
        continue

    cat = map_category(row[1])
    mvt_type, qty = map_movement_type(row)
    if qty == 0:
        continue

    culture = map_culture(row[14])
    site_name = str(row[15]).strip() if not pd.isna(row[15]) else None
    details_site = str(row[16]).strip() if not pd.isna(row[16]) else None
    obs = str(row[20]).strip() if not pd.isna(row[20]) else None

    # NPK
    n_val = esc_num(row[21]) if len(row) > 21 else 'NULL'
    p_val = esc_num(row[22]) if len(row) > 22 else 'NULL'
    k_val = esc_num(row[23]) if len(row) > 23 else 'NULL'
    ca_val = esc_num(row[24]) if len(row) > 24 else 'NULL'
    zn_val = esc_num(row[25]) if len(row) > 25 else 'NULL'

    # Supplier/distributor
    fab_name = str(row[18]).strip() if not pd.isna(row[18]) else None
    dist_name = str(row[19]).strip() if not pd.isna(row[19]) else None
    fab_id = supplier_ids.get(fab_name, None) if fab_name and fab_name not in ('/', '(vide)') else None
    dist_id = supplier_ids.get(dist_name, None) if dist_name and dist_name not in ('/', '(vide)') else None

    cult_sql = f"'{culture}'" if culture else 'NULL'
    fab_sql = f"'{fab_id}'" if fab_id else 'NULL'
    dist_sql = f"'{dist_id}'" if dist_id else 'NULL'

    sql_lines.append(
        f"INSERT INTO movements (date, product_id, category, movement_type, quantity, "
        f"culture, site_name, details_site, supplier_id, distributor_id, observations, "
        f"n_units, p_units, k_units, ca_units, zinc_units) "
        f"VALUES ('{date_str}', '{pid}', '{cat}', '{mvt_type}', {qty}, "
        f"{cult_sql}, {esc(site_name)}, {esc(details_site)}, {fab_sql}, {dist_sql}, {esc(obs)}, "
        f"{n_val}, {p_val}, {k_val}, {ca_val}, {zn_val});"
    )
    movement_count += 1

sql_lines.append(f"\n-- Total movements inserted: {movement_count}")

# ============================================================
# 6. RECALCULATE ALL STOCK LEVELS
# ============================================================
sql_lines.append("\n-- Recalculate all stock levels")
for pname, pid in product_ids.items():
    sql_lines.append(f"SELECT recalc_stock('{pid}');")

# ============================================================
# 7. OPERATORS (sample)
# ============================================================
sql_lines.append("\n-- Operators")
operators = ['Benali Ahmed', 'Khelifa Omar', 'Medjdoub Samir', 'Hamidi Youcef', 'Bouazza Rachid']
for name in operators:
    oid = str(uuid.uuid4())
    sql_lines.append(f"INSERT INTO operators (id, name, role, active) VALUES ('{oid}', '{name}', 'operateur', true);")

# Write output
with open(OUTPUT_PATH, 'w', encoding='utf-8') as f:
    f.write('\n'.join(sql_lines))

print(f"Generated {OUTPUT_PATH}")
print(f"  - {len(supplier_ids)} suppliers")
print(f"  - {len(product_ids)} products")
print(f"  - {len(region_ids)} regions, {len(zone_ids)} zones, {len(site_ids)} sites")
print(f"  - {movement_count} movements")
