# Upozornění na vydání – Google tabulka + Apps Script

Formulář na webu posílá data do tabulky autora (žádný server, žádná další služba).
Složka `_apps_script/` se na web nepublikuje (Jekyll ignoruje složky s `_`).

## Nasazení (jednou)
1. Google Tabulky → nová tabulka „V-arius – upozornění“.
2. Rozšíření → Apps Script → smazat obsah, vložit `Code.gs` → Uložit.
3. Nasadit → Nové nasazení → typ **Webová aplikace**
   - Spustit jako: **Já**
   - Kdo má přístup: **Kdokoli**
   → Nasadit → povolit přístup (Upřesnit → Přejít na projekt (nebezpečné) – je to vlastní skript).
4. Zkopírovat URL končící `/exec` → do `index.html` místo `SCRIPT_URL`.
5. Obnovit tabulku → menu **V-arius → Zapnout denní úklid (jednou)**.

## Po vydání
Menu **V-arius → Rozeslat: vyšlo pro iPhone / Android** → vložit odkaz do obchodu.
Kdo už na nic nečeká, smaže se sám; přes denní limit Gmailu pokračuje skript další den.

## Změna kódu
Po úpravě `Code.gs`: Nasadit → Spravovat nasazení → upravit → Verze: Nová.
(URL `/exec` zůstane stejná.)
