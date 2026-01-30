import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
    try {
        const base44 = createClientFromRequest(req);
        const user = await base44.auth.me();

        if (!user) {
            return Response.json({ error: 'Unauthorized' }, { status: 401 });
        }

        const { query, limit = 20 } = await req.json();

        if (!query) {
            return Response.json({ items: [] });
        }

        const bigBookApiKey = Deno.env.get("BIGBOOK_API_KEY");
        const limitPerService = Math.ceil(limit / 2); // Split limit somewhat, though BigBook has its own

        // Parallel requests to APIs
        const promises = [
            fetch(`https://openlibrary.org/search.json?q=${encodeURIComponent(query)}&limit=${limitPerService}&fields=key,title,author_name,cover_i,first_publish_year,subject`),
            fetch(`https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(query)}&maxResults=${limitPerService}`)
        ];

        if (bigBookApiKey) {
            promises.push(fetch(`https://api.bigbookapi.com/search-books?query=${encodeURIComponent(query)}&api-key=${bigBookApiKey}&number=${limitPerService}`));
        }

        const results = await Promise.allSettled(promises);
        
        const openLibResponse = results[0];
        const googleBooksResponse = results[1];
        const bigBookResponse = bigBookApiKey ? results[2] : null;

        let items = [];
        let bigBookQuota = null;

        // Process Big Book API Results (Priority given for semantic search capabilities)
        if (bigBookResponse && bigBookResponse.status === 'fulfilled' && bigBookResponse.value.ok) {
            try {
                const left = bigBookResponse.value.headers.get('x-api-quota-left');
                const used = bigBookResponse.value.headers.get('x-api-quota-used');
                
                if (left) {
                    bigBookQuota = {
                        left: parseInt(left),
                        used: parseInt(used || 0),
                        limit: parseInt(left) + parseInt(used || 0)
                    };
                }

                const data = await bigBookResponse.value.json();
                if (data.books) {
                    // BigBookAPI returns array of arrays (grouping similar editions)
                    // We flatten and take the first valid one from each group usually, or just flatten all
                    const bbItems = data.books.flat().map(book => ({
                        title: book.title,
                        author: book.authors && book.authors.length > 0 ? book.authors[0].name : 'Desconhecido',
                        year: null, // BigBook search endpoint might not return year directly in the light object, check docs or response
                        cover_url: book.image,
                        external_id: book.id.toString(),
                        subjects: [], // Search endpoint might not return genres
                        source: 'big_book_api',
                        link: null, // BigBook doesn't provide a direct view link usually
                        rating: book.rating?.average
                    }));
                    items = [...items, ...bbItems];
                }
            } catch (e) {
                console.error("Error parsing BigBook API response", e);
            }
        }

        // Process Open Library Results
        if (openLibResponse.status === 'fulfilled' && openLibResponse.value.ok) {
            try {
                const data = await openLibResponse.value.json();
                const olItems = data.docs.map(doc => ({
                    title: doc.title,
                    author: doc.author_name ? doc.author_name[0] : 'Desconhecido',
                    year: doc.first_publish_year,
                    cover_url: doc.cover_i ? `https://covers.openlibrary.org/b/id/${doc.cover_i}-M.jpg` : null,
                    external_id: doc.key,
                    subjects: doc.subject ? doc.subject.slice(0, 5) : [],
                    source: 'open_library',
                    link: `https://openlibrary.org${doc.key}`
                }));
                items = [...items, ...olItems];
            } catch (e) {
                console.error("Error parsing OpenLibrary response", e);
            }
        }

        // Process Google Books Results
        if (googleBooksResponse.status === 'fulfilled' && googleBooksResponse.value.ok) {
            try {
                const data = await googleBooksResponse.value.json();
                if (data.items) {
                    const gbItems = data.items.map(item => {
                        const info = item.volumeInfo;
                        return {
                            title: info.title,
                            author: info.authors ? info.authors[0] : 'Desconhecido',
                            year: info.publishedDate ? info.publishedDate.substring(0, 4) : null,
                            cover_url: info.imageLinks?.thumbnail?.replace('http:', 'https:'),
                            external_id: item.id,
                            subjects: info.categories ? info.categories : [],
                            source: 'google_books',
                            link: info.previewLink || info.infoLink
                        };
                    });
                    items = [...items, ...gbItems];
                }
            } catch (e) {
                console.error("Error parsing Google Books response", e);
            }
        }
        
        // Deduplicate items based on title roughly to avoid too much clutter? 
        // For now, let's just return all unique external_ids from different sources.
        
        return Response.json({ items, bigBookQuota });

    } catch (error) {
        return Response.json({ error: error.message }, { status: 500 });
    }
});
