# Plan de déploiement — Pronostics CDM 2026

## Comment fonctionne l'application

Le cron Vercel tourne toutes les 2 heures et appelle `football-data.org`. Cet appel unique retourne les 104 matchs du tournoi (groupes + toutes les phases finales). Le serveur crée automatiquement les matchs qui n'existent pas encore, met à jour les noms d'équipes dès qu'ils sont connus (ex : "Winner Group A" → "France"), et calcule les points dès qu'un score est confirmé. Aucune intervention manuelle n'est nécessaire pendant le tournoi.

Les cotes sont fetchées séparément depuis The Odds API, une seule fois par match, via un bouton dans l'admin. Elles ne sont plus jamais mises à jour après ça.

---

## Étape 1 — Créer les 4 comptes de services gratuits

### 1.1 GitHub
1. Aller sur [github.com](https://github.com)
2. Créer un compte si pas déjà fait
3. Cliquer sur "New repository"
4. Nom : `worldcup-prono`, visibility : Private (recommandé)
5. Ne pas cocher "Initialize this repository" — on va pousser le code depuis le terminal
6. Copier l'URL du repo (ex : `https://github.com/ton-compte/worldcup-prono.git`)

### 1.2 Supabase
1. Aller sur [supabase.com](https://supabase.com) > "Start your project"
2. Se connecter avec GitHub
3. Cliquer "New project"
   - Organization : ton compte perso
   - Name : `worldcup-prono`
   - Database Password : générer un mot de passe fort et le noter quelque part
   - Region : **West EU (Ireland)** pour minimiser la latence depuis la France
4. Attendre 2-3 minutes que le projet s'initialise
5. Une fois prêt, aller dans **Settings > API** (colonne gauche)
   - Copier **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - Copier **anon public** (sous "Project API keys") → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - Copier **service_role** (cliquer "Reveal") → `SUPABASE_SERVICE_ROLE_KEY`
   - **Attention** : la service_role key donne accès total à la DB, ne jamais la committer ni l'exposer côté client

### 1.3 The Odds API
1. Aller sur [the-odds-api.com](https://the-odds-api.com)
2. Cliquer "Get API Key" > créer un compte
3. Plan gratuit : 500 requêtes/mois (largement suffisant, on en consomme ~104 max)
4. Dans le dashboard, copier l'API key → `ODDS_API_KEY`
5. Note : les cotes pour la CDM 2026 apparaîtront sur la plateforme environ 2-3 semaines avant le coup d'envoi (11 juin 2026). Avant ça, le sport `soccer_fifa_world_cup_2026` ne renverra rien.

### 1.4 football-data.org
1. Aller sur [football-data.org](https://www.football-data.org)
2. Cliquer "Get Free API-Key" > créer un compte
3. Recevoir l'API key par email (arrivée quasi-instantanée)
4. Copier l'API key → `FOOTBALL_DATA_API_KEY`
5. Plan gratuit : 10 requêtes/minute, pas de limite journalière. Le cron toutes les 2h ne fait qu'un seul appel, donc aucun risque de dépasser.
6. Note : la Coupe du Monde 2026 sera accessible via le code compétition `WC`. Si football-data.org n'a pas encore le calendrier complet, l'appel retournera une liste vide ou partielle — dans ce cas le cron ne crée rien et réessaie au prochain cycle.

### 1.5 Vercel
1. Aller sur [vercel.com](https://vercel.com)
2. Cliquer "Continue with GitHub"
3. Autoriser Vercel à accéder à tes repos
4. **Ne pas encore importer le projet** — on le fait après avoir pushé le code

---

## Étape 2 — Configurer les variables d'environnement en local

Dans le dossier `worldcup-prono` :

```bash
cp .env.local.example .env.local
```

Ouvrir `.env.local` et remplir chaque variable avec les valeurs copiées à l'étape 1 :

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxxxxxxxxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

ODDS_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxx

FOOTBALL_DATA_API_KEY=xxxxxxxxxxxxxxxxxxxxxxxxx

ADMIN_SECRET=colle-ici-une-chaine-aleatoire-longue-genre-32-caracteres
CRON_SECRET=une-autre-chaine-aleatoire-differente-de-admin-secret

NEXT_PUBLIC_APP_URL=https://worldcup-prono.vercel.app
```

Pour générer des secrets aléatoires :
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```
Lancer la commande deux fois pour avoir deux valeurs différentes (une pour ADMIN_SECRET, une pour CRON_SECRET).

**Important** : le `.env.local` ne doit jamais être commité. Vérifier que `.gitignore` contient bien `.env.local` (c'est le cas par défaut avec create-next-app).

---

## Étape 3 — Créer le schéma de base de données dans Supabase

1. Aller sur [supabase.com](https://supabase.com) > ton projet `worldcup-prono`
2. Dans la colonne gauche, cliquer **SQL Editor**
3. Cliquer "New query"
4. Ouvrir le fichier `supabase/schema.sql` dans le projet et copier tout le contenu
5. Coller dans l'éditeur SQL de Supabase
6. Cliquer **Run** (ou Cmd+Enter)
7. Vérifier qu'aucune erreur n'apparaît (les lignes `CREATE TABLE`, `CREATE POLICY`, `CREATE VIEW` doivent toutes se terminer avec "Success")
8. Dans le menu gauche > **Table Editor**, vérifier que les 3 tables `users`, `matches`, `predictions` sont présentes, plus les vues `leaderboard` et `predictions_with_match`

---

## Étape 4 — Pousser le code sur GitHub et déployer sur Vercel

### 4.1 Push GitHub

Dans le terminal, depuis le dossier `worldcup-prono` :

```bash
git init
git add .
git commit -m "initial commit"
git branch -M main
git remote add origin https://github.com/ton-compte/worldcup-prono.git
git push -u origin main
```

### 4.2 Import dans Vercel

1. Retourner sur [vercel.com](https://vercel.com) > Dashboard
2. Cliquer "Add New... > Project"
3. Sélectionner le repo `worldcup-prono`
4. Framework : **Next.js** (détecté automatiquement)
5. **Avant de cliquer Deploy**, ouvrir "Environment Variables" et ajouter toutes les variables :

| Nom | Valeur |
|-----|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | URL copiée depuis Supabase |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Clé anon copiée depuis Supabase |
| `SUPABASE_SERVICE_ROLE_KEY` | Clé service_role copiée depuis Supabase |
| `ODDS_API_KEY` | Clé The Odds API |
| `FOOTBALL_DATA_API_KEY` | Clé football-data.org |
| `ADMIN_SECRET` | Le secret généré à l'étape 2 |
| `CRON_SECRET` | L'autre secret généré à l'étape 2 |
| `NEXT_PUBLIC_APP_URL` | L'URL Vercel de ton projet (ex : `https://worldcup-prono.vercel.app`) |

> Astuce : l'URL Vercel est visible dans le dashboard après le premier déploiement. Si tu ne la connais pas encore, déploie d'abord, puis ajoute `NEXT_PUBLIC_APP_URL` et redéploie (Deployments > trois points > Redeploy).

6. Cliquer **Deploy**
7. Attendre 1-2 minutes. Le déploiement réussit quand tu vois "Congratulations!"

### 4.3 Vérifier que le cron est configuré

1. Dans le dashboard Vercel de ton projet > onglet **Cron Jobs**
2. Tu dois voir une entrée `GET /api/cron` avec la fréquence `0 */2 * * *` (toutes les 2 heures)
3. Si l'onglet n'apparaît pas, vérifier que `vercel.json` est bien commité et que le déploiement est à jour

---

## Étape 5 — Premier lancement

### 5.1 Créer ton compte admin

1. Aller sur l'URL de ton site (ex : `https://worldcup-prono.vercel.app/register`)
2. S'inscrire avec ton prénom et nom → note bien ton pseudo généré (ex : `davidleroux`)
3. Tu es maintenant connecté et redirigé vers `/matches` (page vide pour l'instant)

### 5.2 Se passer le rôle admin dans Supabase

1. Retourner dans Supabase > **Table Editor** > table `users`
2. Trouver ta ligne (par ton username)
3. Cliquer sur la cellule `is_admin` et passer la valeur à `true`
4. Sauvegarder
5. Recharger la page du site → l'onglet **Admin** apparaît dans la navbar

### 5.3 Premier sync des matchs

1. Aller dans l'onglet **Admin** de ton site
2. Cliquer **"Sync football-data.org"**
3. football-data.org va retourner les matchs disponibles. Si on est avant le début du tournoi, seuls les matchs de groupes seront là (les phases finales apparaissent avec "TBD vs TBD" ou pas du tout selon le timing)
4. Retourner sur `/matches` : les matchs doivent s'afficher

> Si football-data.org ne retourne rien (tournoi pas encore dans leur système), réessayer quelques jours plus tard. Les données apparaissent généralement 2-4 semaines avant le coup d'envoi.

---

## Étape 6 — Fetcher les cotes (à faire ~1 semaine avant le 11 juin)

1. Aller dans **Admin** de ton site
2. Cliquer **"Fetcher les cotes (tous les matchs)"**
3. The Odds API est interrogée pour chaque match sans cotes
4. Les cotes s'affichent en vert dans la liste des matchs de l'admin
5. Une fois fetchées, elles ne changent plus jamais (figées en DB)

> Si The Odds API ne retourne pas encore les cotes de la CDM 2026, un message d'erreur s'affiche dans l'admin. Réessayer quelques jours plus tard. En dernier recours, les cotes peuvent être saisies manuellement depuis Supabase > Table Editor > matches.

---

## Étape 7 — Inviter les participants

1. Partager l'URL du site (`https://worldcup-prono.vercel.app/register`)
2. Chaque participant s'inscrit avec son prénom, nom, mot de passe
3. Son pseudo est généré automatiquement (ex : `kariembenzema`)
4. Dès que les cotes sont en place, ils peuvent pronostiquer les matchs

---

## Ce qui se passe pendant le tournoi (automatique)

Le cron tourne toutes les 2 heures. À chaque cycle :

1. Il appelle `football-data.org/v4/competitions/WC/matches`
2. **Matchs de groupes** : les 48 matchs existent déjà, le cron vérifie s'ils sont terminés et calcule les points si oui
3. **Phase finale** : au fur et à mesure que les équipes sont qualifiées, les matchs de huitièmes/quarts/demi/finale passent de "TBD vs TBD" à des équipes réelles. Le cron met à jour les noms automatiquement. Les joueurs peuvent alors pronostiquer ces matchs.
4. Les points sont calculés automatiquement dès que le score final est confirmé par football-data.org (en général 15-30 minutes après le coup de sifflet final)

**Rien à faire pendant le tournoi.** Tu peux quand même aller dans l'admin et cliquer "Sync" manuellement si tu veux forcer une mise à jour immédiate après un match.

Pour les cotes des matchs à élimination directe : aller dans Admin et cliquer "Fetcher les cotes" au moment où les équipes sont connues (après la phase de groupes). The Odds API donne les cotes dès que les confrontations sont officielles.

---

## Résumé des variables d'environnement

| Variable | Où la trouver | Usage |
|----------|--------------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase > Settings > API | Connexion DB (public) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase > Settings > API | Connexion DB client (public) |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase > Settings > API | Accès DB sans RLS (serveur uniquement) |
| `ODDS_API_KEY` | the-odds-api.com dashboard | Fetch des cotes |
| `FOOTBALL_DATA_API_KEY` | football-data.org > email | Sync matchs + résultats |
| `ADMIN_SECRET` | Généré par toi | Sécurise les routes admin |
| `CRON_SECRET` | Généré par toi | Sécurise le cron Vercel |
| `NEXT_PUBLIC_APP_URL` | URL de ton projet Vercel | Appels internes API |

---

## En cas de problème

**Les matchs ne s'affichent pas après le Sync**
→ football-data.org ne retourne peut-être pas encore la CDM 2026. Vérifier en appelant directement l'API depuis ton navigateur : `https://api.football-data.org/v4/competitions/WC/matches` avec le header `X-Auth-Token: ta_clé`.

**Les cotes ne se fetchent pas**
→ The Odds API n'a peut-être pas encore le sport `soccer_fifa_world_cup_2026`. Vérifier les sports disponibles : `https://api.the-odds-api.com/v4/sports?apiKey=ta_clé`.

**Le cron ne se déclenche pas**
→ Les cron jobs Vercel ne fonctionnent que sur des projets déployés (pas en local). Vérifier dans Vercel > ton projet > onglet Cron Jobs. Si le cron n'apparaît pas, s'assurer que `vercel.json` est bien présent à la racine du projet et redéployer.

**Un utilisateur a fait une faute dans son nom à l'inscription**
→ Aller dans Supabase > Table Editor > `users`, modifier `first_name`, `last_name`, `username` directement. Faire la même correction dans Supabase > Authentication > Users pour l'email (format `username@prono.internal`).
