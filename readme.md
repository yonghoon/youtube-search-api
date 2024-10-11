# Youtube Search API
- This is a typescript version of https://www.npmjs.com/package/youtube-search-api.

## How to use
- Install package
```
npm install youtube-search-api-ts
```
- Search
```
import { NextPage, YoutubeSearchApi } from "youtube-search-api-ts"
const api = new YoutubeSearchApi()

// Search
const output1 = await api.search("cat", true, 2, [{ type: "video" }])

// Fetch subsequent pages
const output2 = await api.getNextPage(output1.nextPage, true, 2)

const output3 = await api.getNextPage(output2.nextPage, true, 2)
```