# Scenariusz demo: od wątku na Slacku do pull requesta

Potrzebujesz dwóch kont w Slacku. Dalej to **PO** (Ty) i **Księgowa** (drugie konto). Wiadomości są po angielsku, bo zrzuty trafią do artykułu. Rób zrzut po każdym kroku.

Zanim zaczniesz: agent działa (`hermes gateway run`), siedzi na kanale, a oba konta są na liście dozwolonych.

## Scenariusz 1: rabat, czyli wiedza, która jest tylko w wątku (główny)

Sam request jest ogólny. Szczegóły dopisuje w wątku druga osoba. Pytanie brzmi: czy agent je weźmie.

1. **PO** zakłada wątek:
   > Clients keep asking for a discount on invoices. Can we add one?
2. **Księgowa** odpowiada w wątku:
   > Yes, but a few rules: the discount is a percentage of the net total and comes off before VAT. Max 50%. Show it as its own row between Net and VAT. Round it half up to the cent like everything else.
3. **PO** w tym samym wątku:
   > @<bot> handle it
4. Czekasz na PR. Zapisz czas od wzmianki do linku.
5. **Księgowa** po PR, w tym samym wątku, bez oznaczania bota:
   > One more thing: a 0% VAT invoice can't have a discount.

   (Hermes domyślnie odpowiada w aktywnym wątku bez wzmianki. Jeśli bot milczy, oznacz go.)
6. Agent poprawia ten sam PR. Zapisz czas.

**Sprawdź w PR, czy agent wziął z wątku wszystko:**

| Ustalenie z wątku | W kodzie? | W teście? | W sekcji „Slack thread”? |
|---|---|---|---|
| Rabat to procent od netto | | | |
| Rabat przed VAT | | | |
| Maksymalnie 50% | | | |
| Osobny wiersz między Net a VAT | | | |
| Zaokrąglenie half up do grosza | | | |
| Brak rabatu przy VAT 0% (krok 5) | | | |

Do tego: czy link w sekcji „Slack thread” otwiera ten wątek. Na koniec zmerguj PR sam, po review.

## Scenariusz 2: szybka zmiana (opcjonalny)

Dla porównania czasu z małym zadaniem, jak „16 minut” w artykule.

> @<bot> Add a currency selector with PLN and EUR. Only the formatting changes, no conversion.

## Scenariusz 3: skąd ta decyzja (następnego dnia)

Nowy wątek, bez linku i bez kontekstu:

> @<bot> Why is VAT calculated after the discount? Link the place where we decided it.

Bez wyszukiwania w Slacku (etap 6b) agent nie widzi starego wątku. Może za to znaleźć PR z rabatem (`gh pr list`, `git log`), a w nim sekcję „Slack thread” z linkiem. Jeśli tak odpowie, masz dowód na krok 5 artykułu: link w PR to jedyna droga powrotu do decyzji. Jeśli nie znajdzie, też to zapisz.

## Co z tego idzie do artykułu

- Zrzuty wątku ze scenariusza 1: request, uwagi Księgowej, link do PR, poprawka po kroku 5.
- Wypełniona tabela powyżej.
- Czasy: wzmianka → PR, uwaga → poprawka.
- Odpowiedź ze scenariusza 3.
