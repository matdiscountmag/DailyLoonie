# Products Reference

**Tracking policy:** Every product is tracked as a specific SKU. Always match the exact product listed in the `## Products` table below — do not substitute or capture alternatives. All products are identified by their Loblaws Product ID, which is stable across scrape runs.

---

## Normalization Rules

| Product type | Normalize to |
|---|---|
| Packaged solids (cereal, chips, frozen, etc.) | per 100g |
| Liquids (juice, milk, pasta sauce, etc.) | per 100ml |
| Produce sold by weight | per kg |
| Produce sold by each (ea) | per ea |
| Eggs | per egg (use unit price shown on site) |

---

## Products

| Brand | Product | Size | Unit | Product ID |
|---|---|---|---|---|
| — | Strawberries 1LB | 454 g | per 100g | 20049778001_EA |
| — | Honeydew Melon | 1 ea | per ea | 20045276001_EA |
| — | Cantaloupe | 1 ea | per ea | 20167017001_EA |
| — | LoBok (Daikon Radish) | variable | per kg | 20082109001_KG |
| — | Chinese Carrots, Jumbo | variable | per kg | 20851084001_KG |
| Milk 2 Go | 2% Partly Skimmed Milk | 6x200 ml | per 100ml | 21537885_EA |
| Burnbrae Farms | Nature's Best White Eggs, Large | 12 ea | per egg | 20814983001_EA |
| Silk | Soy Milk Alternative, Vanilla | 1.89 l | per 100ml | 20124384002_EA |
| Green Giant | Corn Niblets, Whole Kernel | 341 ml | per 100ml | 21021224_EA |
| Tropicana | 100% Fresh Pressed Apple Juice | 1.36 l | per 100ml | 21677467_EA |
| Quaker | Life Original Cereal | 450 g | per 100g | 20637355_EA |
| President's Choice | Chicken Spring Rolls | 574 g | per 100g | 20698133_EA |
| Kelloggs | Eggo Thick & Fluffy Waffles Original | 330 g | per 100g | 21511747_EA |
| Lay's | Wavy Lightly Salted Potato Chips | 235 g | per 100g | 21240913_EA |
| Pita Break | Mini Pitas, Regular | 450 g | per 100g | 20125755_EA |
| Softsoap | Refill Hand Soap | 1.47 l | per 100ml | 21715576_EA |
| Janes | Pub Style Chicken Nugget, Fully Cooked | 700 g | per 100g | 21191830_EA |
| Cashmere | Soft & Thick Toilet Paper, 24 Double Rolls | 1 ea | per double roll | 21186207_EA |
| Farmer's Market | Sweet Baby Peppers (4-Pack) | 1 ea | per ea | 20117550001_EA |
| — | Papaya | variable | per kg | 20817066001_KG |
| Butcher's Choice | Medium Ground Beef | 450 g | per 100g | 21595175_EA |
| Maple Leaf | Original Natural Bacon | 375 g | per 100g | 20732366_EA |
| Aveeno | Positively Radiant Daily Moisturizer SPF 15 | 120 ml | per 100ml | 21505336_EA |
| — | Extra Large Green Seedless Grapes | variable | per kg | 20425775001_KG |
| President's Choice | Hummus | 227 g | per 100g | 20584097_EA |
| President's Choice | Sugar Cones | 142 g | per 100g | 20340143_EA |
| Tropicana | Orange Juice, No Pulp | 1.36 l | per 100ml | 21622130_EA |
| Pantene | Daily Moisture Renewal 2-in-1 Shampoo & Conditioner | 355 ml | per 100ml | 21431193_EA |
| Pantene | Daily Moisture Renewal 2-in-1 Shampoo & Conditioner | 530 ml | per 100ml | 21431726_EA |
| Pantene | Daily Moisture Renewal 2-in-1 Shampoo & Conditioner | 820 ml | per 100ml | 21641893_EA |
| Kadoya | Pure Sesame Oil | 327 ml | per 100ml | 20990809_EA |
| Sensodyne | Repair And Protect Toothpaste For Sensitive Teeth | 75 ml | per 100ml | 21471658_EA |
| Christie | Teddy Graham Cookies | 200 g | per 100g | 21585222_EA |
| — | Broccoli Crown | 1 ea | per ea | 21121560001_EA |
| Bertolli | Rich Taste Extra Virgin Olive Oil - Organic | 750 ml | per 100ml | 21039665_EA |
| — | Blueberries 1 pint | 1 ea | per 100g | 20080137001_EA |
| — | Blueberries Half Pint | 170 g | per 100g | 20152465001_EA |
| Kelloggs | Mini Wheats Cereal Low Sugar Lightly Frosted Original | 450 g | per 100g | 21594586_EA |
| Oikos | Greek Yogurt, Plain, 0% M.F. | 750 g | per 100g | 21006634_EA |
| — | Fresh Atlantic Salmon Fillets, Skin On, Packaged | variable | per kg | 20852143_KG |

*Product IDs for ribeye steak, sweet baby peppers, papaya, and ground beef added Apr 2026. Maple Leaf Original Natural Bacon added Apr 2026. Aveeno Positively Radiant Daily Moisturizer added Apr 2026. Extra Large Green Seedless Grapes added Apr 2026. PC Hummus and PC Sugar Cones added Apr 2026. T&T Pork and Vegetable Potstickers and Tropicana Orange Juice No Pulp added Apr 2026. Pantene 2-in-1 (355ml, 530ml, 820ml), Kadoya Pure Sesame Oil, Oral B Floss, Sensodyne Repair & Protect Toothpaste, Buono Mochi Ice Dessert, and Christie Teddy Graham Cookies added May 2026. Broccoli Crown and Bertolli Rich Taste Extra Virgin Olive Oil - Organic added Jun 2026 (already present on the Mat list). Blueberries 1 pint, Blueberries Half Pint, Kelloggs Mini Wheats Low Sugar, Oikos Greek Yogurt 0% (replacing 2%), and Fresh Atlantic Salmon Fillets added Nov 2026. On each scrape run, verify the returned product name and size still match — a mismatch may indicate the SKU was discontinued or replaced.*

---

## Retired Products — do not scrape

No longer tracked: these are off the Mat list and must not be scraped. Their past rows stay in `prices.csv` as history. To retire a product, remove it from the Mat list, then move its row here from `## Products` and add the retirement date (`YYYY-MM-DD`). To reactivate, move it back to `## Products` and re-add it to the Mat list.

| Brand | Product | Size | Unit | Product ID | Retired |
|---|---|---|---|---|---|
| President's Choice | Certified Angus Beef Grilling Ribeye Steak Boneless | variable | per kg | 20801988_KG | 2026-11-01 |
| Farmer's Market | Mandarin, 4 lb bag | 1.8 kg | per 100g | 20054025001_EA | 2026-11-01 |
| Farmer's Market | Mandarin Oranges, 2 lb bag | 907 g | per 100g | 20099819001_EA | 2026-11-01 |
| T&T | Pork and Vegetable Potstickers | 567 g | per 100g | 21495823_EA | 2026-11-01 |
| Oral B | EssentialFloss Cavity Defense Dental Floss | 50 M | per ea | 20012884_EA | 2026-11-01 |
| Buono | Mochi Ice Dessert Cool Mix | 208 g | per 100g | 21002188_EA | 2026-11-01 |
| Nissin | Demae Ramen Sesame Oil Flavour | 500 g | per 100g | 21438999_EA | 2026-11-01 |
| Oikos | Greek Yogurt, Plain, 2% M.F. | 750 g | per 100g | 21006885_EA | 2026-11-01 |

---

## Notes

- **Produce by ea** (honeydew, cantaloupe): price per ea is the comparison unit — no further normalization needed.
- **Produce/meat by weight** (daikon, carrots, papaya, grapes, salmon): normalize to per kg regardless of how the item is displayed at time of scrape.
- **Milk 2 Go**: sold as 6x200ml multipacks — per 100ml normalizes across any future pack size changes.
