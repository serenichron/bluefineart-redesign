# bluefineart.com: current site audit (2026-11-06)

Platform: Webflow (CSS file is still named `bluefineart-staging`). Redirects to `www.bluefineart.com`.
Business name used on site: **Blue Gallery**. Founder/owner: Rami Rotkopf (family art business, Tel Aviv).

## Locations and hours
- Blue Gallery, 600 E. Atlantic Avenue, Delray Beach, FL 33483. Tel 561-265-0020
- Designer showroom, 11975 W. Sample Road, Coral Springs, FL 33065. Tel 954-282-6945
- Hours (main site): Mon-Thu 10-6, Fri 10-7, Sat 10-8, Sun 10-6
- Hours (old landing pages): Mon-Thu 10-6, Fri-Sun 10-7. **Conflict.**

## Size: 1,539 URLs in the sitemap
| Section | Count | What it is |
|---|---|---|
| /art/ | 1,340 | One page per artwork (artist, title, medium, size, item code, edition, enquiry form, WhatsApp). No prices. |
| /art-collections/ | 95 | An artist's series, e.g. "Alex Pauker - Contemporary". Grid of works, "View in room", one enquiry form per artwork. |
| /artist/ | 34 | Artist profile: collections, biography, exhibition history. |
| /exhibition/ | 33 | Past events back to 2013. Many are near empty. |
| /art-gallery/ | 12 | Gallery photos (interior/exterior). No titles. |
| /post/ | 4 | Blog posts, last one Jan 2024. |
| Other | ~21 | Home, Our galleries, Artists, Videos, Exhibitions, Contact, Blog, Virtual, Catalogs, Sculptures, David Schluss landing page, thank-you pages, legal. |

## Main nav
Home, Our galleries, Artists, Videos, Exhibitions, Contact, Blog, Virtual, "Make an appointment".

## Homepage sections
Hero slider (8 artworks), featured collections (34 artists + 17 collections), artists carousel, About us, stats (32 artists, 5000 arts), "As seen in", new artworks (~100), Press/news list, subscribe form.

## Artists (34)
David Schluss, Joel Amit, Sveta Esser, Alex Pauker, Isaac Maimon, Red Head, Isaac Kahn, Adriana Naveh, Lenner Gogli, Mark Kanovich, Gil Goren, Nathan Baer, Gadi Fraiman, Patrick Pease, Rina Maimon, Marc Lipp, David D'Or, Calman Shemi, Ron Agam, Niso Maman, Avi Ben Simhon, Amir Genislaw, Avi Ram, Benda, Iris Eshet Cohen, Stacy O'Nell, Todd Andrew Babb, Harry Guttman, Lior Ron, Tzuki Art, Yuval Orly, Natalie Rozenbaum, Neil Loeb, Murray Weinstein.
(Homepage says 32 artists.)

## Recent activity
- Online shows on Artsy (2024 to Sep 2026)
- 20th anniversary group show, 21 Mar 2026
- Art fairs: CONTEXT Art Miami, Art Wynwood, Palm Beach Show, Hamptons Fine Art Fair

## Third-party scripts
GTM, Facebook Pixel, Mailchimp, HubSpot forms, Crisp chat, Zendesk chat, Apple Business Chat, Finsweet CMS library, GSAP, Swiper, Slick, jQuery, and an unknown `n684td.csb.app/script.js` (CodeSandbox) script.

## Problems found
- Leftover Webflow placeholder "This is some text inside of a div block" on the homepage.
- Footer says "© 2022".
- Exhibitions year filter stops at 2023/2024 while events run to 2026.
- Exhibition with end time before start time (13 Dec 2025, 4pm - 2pm).
- Typos in artwork data: "Adrana Naveh", "Isaac Mimon", lowercase "david schluss"; zip "FL 3483" on landing pages.
- Catalogs page is empty (stray text "car loop").
- Virtual tour page shows only a heading.
- Videos page embeds YouTube `watch?v=` URLs in iframes, which YouTube blocks. Likely broken unless a script rewrites them.
- Missing page titles on /exhibition/ and /art-gallery/ items; missing meta description on Blog, Sculptures, Art gallery, Search.
- Three chat widgets plus two form systems loaded on every page. Homepage is ~307 KB HTML with ~309 images.
- Two slider libraries (Swiper and Slick) loaded together.
- Each collection page repeats a full enquiry form per artwork (8 forms on one page).
- Blog inactive since Jan 2024.
- Contact form makes phone required.
