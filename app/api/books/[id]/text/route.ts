const res = await fetch(
  `https://project-gutenberg-books-api.p.rapidapi.com/api/books/${id}/text`,
  {
    headers: {
      "X-RapidAPI-Key": process.env.GUTENBERG_API_KEY!,
      "X-RapidAPI-Host": "project-gutenberg-books-api.p.rapidapi.com",
    },
  }
);