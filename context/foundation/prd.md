---
project: "FlashGen"
version: 1
status: draft
created: 2026-09-22
context_type: greenfield
product_type: web-app
target_scale:
  users: small
  qps: low
  data_volume: small
timeline_budget:
  mvp_weeks: 8
  hard_deadline: 2027-01-10
  after_hours_only: true
---

## Vision & Problem Statement

Osoba przygotowująca się do egzaminu, czytając notatki, podręcznik lub artykuł, chce zacząć naukę metodą spaced repetition — ale ma przed sobą surowy tekst, a nie gotowe fiszki. Ręczne wyodrębnianie pytań i odpowiedzi z materiału to nie tylko strata czasu: samo zdecydowanie, jak podzielić tekst na sensowne pytanie-odpowiedź, blokuje rozpoczęcie nauki (paraliż decyzyjny) i odsuwa moment, w którym realnie zaczyna się powtarzanie materiału.

Istniejące narzędzia do spaced repetition (np. Anki, Quizlet) zakładają, że fiszki już istnieją albo że użytkownik tworzy je ręcznie, jedną po drugiej. Żadne z nich nie oferuje kroku „wklej tekst źródłowy → dostań propozycje fiszek do przejrzenia” — a to właśnie ten krok usuwa paraliż decyzyjny, bo przenosi ciężar z „jak to podzielić” na „czy ta propozycja jest dobra”, co jest zadaniem prostszym i szybszym.

## User & Persona

**Osoba ucząca się (ja sam/sama)** — jeden nazwany użytkownik, budujący produkt przede wszystkim na własny użytek. Rola: student/uczeń przygotowujący się do egzaminu. Kontekst: ma przed sobą materiał źródłowy (notatki, podręcznik, artykuł) i chce zacząć naukę metodą spaced repetition. Moment sięgnięcia po produkt: gdy ma tekst do nauczenia się, ale nie ma jeszcze gotowych fiszek, i nie chce tracić czasu na ich ręczne tworzenie.

## Success Criteria

### Primary
- Użytkownik loguje się, wkleja tekst źródłowy, klika "Generuj fiszki", przegląda wygenerowane propozycje (przód/tył), odznacza nietrafione, klika "Zapisz do bazy" i widzi zaakceptowane fiszki w widoku "Moje fiszki".

### Secondary
- Użytkownik może ręcznie edytować treść fiszki (przód/tył) przed zapisem, a nie tylko ją zaakceptować lub odrzucić.

### Guardrails
- Fiszki jednego użytkownika nigdy nie są widoczne ani dostępne dla innego użytkownika.
- Jeśli generowanie propozycji się nie powiedzie (błąd wywołania modelu AI), wklejony tekst źródłowy nie ginie — użytkownik może spróbować ponownie bez ponownego wklejania.

## User Stories

### US-01: Użytkownik generuje i zapisuje fiszki z wklejonego tekstu

- **Given** zalogowany użytkownik na głównym ekranie aplikacji
- **When** wklei tekst źródłowy, kliknie "Generuj fiszki", przejrzy propozycje, odznaczy nietrafione i kliknie "Zapisz do bazy"
- **Then** zaakceptowane fiszki zostają zapisane na jego koncie i widoczne w widoku "Moje fiszki"

#### Acceptance Criteria
- Propozycje fiszek pojawiają się jako pary przód (pytanie) / tył (odpowiedź)
- Odznaczenie propozycji wyklucza ją z zapisu
- Zapisane fiszki są przypisane wyłącznie do konta użytkownika, który je utworzył

## Functional Requirements

### Autoryzacja
- FR-001: Aktor może zalogować się do systemu, aby aplikacja rozpoznała jego tożsamość i zabezpieczyła dostęp do jego profilu. Priority: must-have
  > Socrates: Counter-argument considered: "logowanie na starcie może być zbędnym progiem wejścia, skoro to jeden użytkownik" vs. "bez logowania nie da się bezpiecznie odseparować danych, gdy pojawi się kolejny użytkownik". Resolution: kept as written — ryzyko braku separacji danych w przyszłości przeważa nad tarciem logowania.

### Generowanie fiszek
- FR-002: Aktor może wkleić tekst źródłowy, z którego chce wyciągnąć informacje. Priority: must-have
  > Socrates: Counter-argument considered: "brak limitu długości tekstu może przeciążyć generowanie i dawać niskiej jakości propozycje". Resolution: kept as written; limit długości tekstu to kwestia implementacyjna do ustalenia przy wyborze stacku/API, nie zmiana zakresu FR.
- FR-003: Aktor może wyzwolić generowanie i otrzymać propozycje par pytanie-odpowiedź. Priority: must-have
  > Socrates: Counter-argument considered: "zależność od zewnętrznego API AI jest ryzykiem — koszt, opóźnienie lub niedostępność mogą zablokować całą wartość produktu". Resolution: kept as written; to rdzeń wartości produktu, ryzyko akceptowane i częściowo zaadresowane przez guardrail "tekst źródłowy nie ginie przy błędzie generowania".
- FR-004: Aktor może przejrzeć wygenerowaną listę propozycji i zaznaczyć/odznaczyć wybrane pozycje przed zapisem. Priority: must-have
  > Socrates: Counter-argument considered: "sama selekcja bez podglądu jakości/kontekstu nie wystarczy, żeby ocenić, czy fiszkę zaakceptować". Resolution: kept as written dla MVP; rozszerzony podgląd kontekstu pozostaje poza zakresem na razie.

### Zarządzanie fiszkami
- FR-005: Aktor może ręcznie poprawić treść wygenerowanego pytania lub odpowiedzi przed zapisem. Priority: nice-to-have
  > Socrates: Counter-argument considered: "bez edycji użytkownik będzie odrzucał całe fiszki zamiast poprawiać drobne błędy, co obniża wartość generowania". Resolution: kept nice-to-have; odrzucenie i ponowna próba to akceptowalne obejście na MVP.
- FR-006: Aktor może zatwierdzić i zapisać wyselekcjonowane fiszki do trwałego magazynu danych przypisanego do jego konta. Priority: must-have
  > Socrates: Counter-argument considered: "nieodwracalny zapis bez podglądu grozi przypadkowym zapisaniem złej fiszki". Resolution: kept as written; krok przeglądu i selekcji w FR-004 już pełni rolę podglądu przed zapisem.
- FR-007: Aktor może wejść w dedykowany widok i zobaczyć listę wszystkich posiadanych przez siebie fiszek. Priority: must-have
  > Socrates: Counter-argument considered: "sam podgląd bez trybu nauki (spaced repetition) nie domyka pierwotnego celu — samej nauki". Resolution: kept as written dla MVP; tryb nauki pozostaje poza zakresem i trafia do Non-Goals.
- FR-008: Aktor może skasować niechciane fiszki. Priority: nice-to-have
  > Socrates: Counter-argument considered: "no counter-argument; it stands as written". Resolution: kept nice-to-have.

## Non-Functional Requirements

- Wklejony tekst źródłowy dłuższy niż ustalony limit (np. 5000 znaków) jest odrzucany z czytelnym komunikatem, zanim trafi do generowania — chroni to przed przeciążeniem przetwarzania i nadmiernym zużyciem budżetu wywołań modelu AI.
- Aplikacja pozostaje w pełni użyteczna — poprawnie działa i jest czytelna — na najnowszych wersjach nowoczesnych przeglądarek.

## Business Logic

Aplikacja analizuje wprowadzony tekst i samodzielnie decyduje, które zawarte w nim informacje stanowią kluczowe pojęcia, automatycznie przekształcając je w optymalne pary pytań i odpowiedzi.

Wejście: dowolny tekst źródłowy wklejony przez użytkownika (notatki, fragment podręcznika, artykuł). Wynik: lista propozycji fiszek jako pary pytanie/odpowiedź, gotowa do przeglądu. Reguła uruchamia się zaraz po kliknięciu „Generuj fiszki”, a jej wynik trafia bezpośrednio do ekranu przeglądu i selekcji.

## Access Control

Logowanie (email + hasło lub OAuth). Model płaski — brak ról administracyjnych; każdy zalogowany użytkownik widzi i zarządza wyłącznie swoimi fiszkami. Logowanie służy głównie do oddzielenia danych jednego użytkownika od innych i do zapewnienia dostępu z różnych urządzeń.

## Non-Goals

- Brak własnego algorytmu spaced repetition — MVP generuje i zapisuje fiszki, ale nie implementuje harmonogramu powtórek ani trybu nauki; to osobny, większy temat na później.

## Open Questions

None — all required inputs were captured during shaping (`/10x-shape` quality cross-check reported no gaps).
