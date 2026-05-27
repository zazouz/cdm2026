# Guide de déploiement — CDM 2026

Mise en ligne gratuite avec GitHub + Supabase + Vercel. Prévois 45 min.

---

## Stack de déploiement

| Service | Rôle | Gratuit |
|---|---|---|
| GitHub | Stocker le code | Oui |
| Supabase | Base de données + auth | Oui (500 MB, largement suffisant) |
| Vercel | Hébergement Next.js | Oui (100 GB bande passante/mois) |
| football-data.org | Résultats des matchs | Oui (plan gratuit) |
| The Odds API | Côtes bookmaker | Oui (500 req/mois) |

---

## ÉTAPE 1 — GitHub : créer un compte et pousser le code

**1.1** Va sur **github.com**, clique **Sign up**, crée un compte avec ton email perso.

**1.2** Une fois connecté, clique **+** en haut à droite → **New repository**.
- Nom : `cdm2026`
- Laisse tout par défaut
- Clique **Create repository**

**1.3** Génère un Personal Access Token (remplace le mot de passe Git) :
- Clique sur ta photo → **Settings** → (tout en bas) **Developer settings**
- **Personal access tokens** → **Tokens (classic)** → **Generate new token**
- Coche **repo**, mets 1 an d'expiration, clique **Generate**
- **Copie le token — il ne s'affiche qu'une seule fois**

**1.4** Ouvre le Terminal (`Cmd + Espace` → "Terminal") et tape :

```bash
cd ~/Desktop/worldcup-prono
git init
git add .
git commit -m "premier commit"
```

**1.5** Configure le remote avec tes credentials intégrés dans l'URL (remplace `TON_PSEUDO` et `TON_TOKEN`) :

```bash
git remote set-url origin https://TON_PSEUDO:TON_TOKEN@github.com/TON_PSEUDO/cdm2026.git
# ou si la remote n'existe pas encore :
git remote add origin https://TON_PSEUDO:TON_TOKEN@github.com/TON_PSEUDO/cdm2026.git
```

**1.6** Pousse le code :

```bash
git branch -M main
git push -u origin main
```

Recharge la page GitHub — tu dois voir tous tes fichiers.

> **Note** : intégrer le token dans l'URL est la méthode la plus simple quand on a plusieurs comptes GitHub sur le même Mac. Le token est secret, ne le partage pas.

---

## ÉTAPE 2 — Supabase : créer la base de données

**2.1** Va sur **supabase.com** → **Start your project** → crée un compte (ou connecte-toi avec GitHub).

**2.2** Clique **New project** :
- **Name** : `cdm2026`
- **Database Password** : clique sur le dé pour générer, note-le
- **Region** : West EU (Ireland) ou Frankfurt
- Clique **Create new project** — attends 1-2 min

**2.3** Crée les tables : menu gauche → **SQL Editor**.

Ouvre `supabase/schema.sql` (dans le dossier du projet), copie tout le contenu, colle dans l'éditeur, clique **Run**.

Tu dois voir "Success". Vérifie dans **Table Editor** que `users`, `matches`, `predictions` existent.

**2.4** Récupère tes clés API : **Project Settings** (engrenage) → **API** :
- Note le **Project URL** (`https://xxxxx.supabase.co`)
- Note la clé **anon public**
- Note la clé **service_role** (clique Reveal)

---

## ÉTAPE 3 — APIs externes

### football-data.org
- Va sur **football-data.org** → **Get Started for free**
- Crée un compte, confirme l'email
- Ton **API Token** est dans ton profil

### The Odds API
- Va sur **the-odds-api.com** → **Get API Key**
- Crée un compte
- Ta clé est sur le dashboard

---

## ÉTAPE 4 — Inventer tes secrets

Deux mots de passe que tu choisis toi-même pour protéger les routes admin :

- **ADMIN_SECRET** : ex. `cdm2026-admin-xJ9kP3` (chaîne longue sans espaces)
- **CRON_SECRET** : ex. `cdm2026-cron-mT7wQ5` (idem, différent du premier)

Note-les — tu en as besoin dans les étapes suivantes.

---

## ÉTAPE 5 — Vercel : déployer le site

**5.1** Va sur **vercel.com** → **Sign Up** → **Continue with GitHub** (utilise ton compte perso).

**5.2** Clique **Add New Project** → trouve `cdm2026` → **Import**.

**5.3** Avant de déployer, descends jusqu'à **Environment Variables** et ajoute ces 8 variables :

| Variable | Valeur |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | ton Project URL Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | clé anon public Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | clé service_role Supabase |
| `FOOTBALL_DATA_API_KEY` | ta clé football-data.org |
| `ODDS_API_KEY` | ta clé The Odds API |
| `ADMIN_SECRET` | ton secret admin inventé |
| `CRON_SECRET` | ton secret cron inventé |
| `NEXT_PUBLIC_APP_URL` | laisse vide pour l'instant |

**5.4** Clique **Deploy**. Attends 2-3 minutes.

**5.5** Une fois déployé, note l'URL du site (ex. `https://cdm2026.vercel.app`).

**5.6** Retourne dans **Settings** → **Environment Variables**, édite `NEXT_PUBLIC_APP_URL` et mets l'URL du site. Puis **Redeploy** (bouton en haut à droite → Redeploy).

---

## ÉTAPE 6 — Configurer le cron (calcul automatique des points)

**6.1** Vérifie que `vercel.json` contient bien :

```json
{
  "crons": [
    {
      "path": "/api/cron",
      "schedule": "*/30 * * * *"
    }
  ]
}
```

Si ce fichier n'existe pas, crée-le avec ce contenu.

**6.2** Si tu l'as créé ou modifié, pousse sur GitHub :
```bash
cd ~/Desktop/worldcup-prono
git add vercel.json
git commit -m "cron config"
git push
```

Vercel redéploie automatiquement.

---

## ÉTAPE 7 — Importer les matchs

Le site tourne mais la base est vide. Lance ces commandes dans le Terminal (remplace l'URL et le secret) :

```bash
# Importer les matchs depuis football-data.org
curl -X POST https://cdm2026.vercel.app/api/admin/seed-matches \
  -H "x-admin-secret: TON_ADMIN_SECRET"

# Récupérer les côtes
curl -X POST https://cdm2026.vercel.app/api/admin/fetch-odds \
  -H "x-admin-secret: TON_ADMIN_SECRET"
```

Tu dois voir `{"ok":true,...}` en réponse.

---

## ÉTAPE 8 — Créer ton compte admin

**8.1** Va sur `https://cdm2026.vercel.app/register` et crée ton compte normalement.

**8.2** Dans Supabase → **Table Editor** → table `users` → trouve ta ligne → mets `is_admin` à `true` → sauvegarde.

Tu as maintenant accès à `/admin` pour gérer les matchs.

---

## ÉTAPE 9 — Inviter des joueurs

Envoie-leur le lien : `https://cdm2026.vercel.app/register`

---

## Mises à jour du code (workflow normal)

Chaque fois que tu modifies le code et veux mettre en ligne :

```bash
cd ~/Desktop/worldcup-prono
git add .
git commit -m "description du changement"
git push
```

Vercel redéploie automatiquement en 2-3 minutes.

---

## En cas de problème

| Symptôme | Cause probable | Solution |
|---|---|---|
| Page blanche / erreur 500 | Variable d'env manquante | Vercel → projet → Functions → logs |
| "Invalid API key" | Clé mal copiée (espace parasite) | Revérifier dans Vercel → Settings → Env Vars |
| Base de données vide | Seed non lancé ou ADMIN_SECRET incorrect | Relancer le curl de l'étape 7 |
| Build Vercel échoue | Erreur TypeScript | Lire les logs de build dans Vercel |
| Push GitHub refuse | Mauvais compte en cache | Voir section "Problème de compte GitHub" ci-dessous |

---

## Problème de compte GitHub (plusieurs comptes sur le même Mac)

Si Git pousse avec le mauvais compte GitHub, la solution la plus simple est d'intégrer ton token directement dans l'URL de la remote :

```bash
git remote set-url origin https://TON_PSEUDO:TON_TOKEN@github.com/TON_PSEUDO/cdm2026.git
```

Remplace `TON_PSEUDO` par ton pseudo GitHub perso et `TON_TOKEN` par le Personal Access Token généré à l'étape 1.3.

Pour vérifier que c'est bon :
```bash
git remote -v
# doit afficher : origin  https://TON_PSEUDO:TON_TOKEN@github.com/...
```
