import _ from "lodash"
import { NextPage, YoutubeSearchApi } from ".."

const api = new YoutubeSearchApi()

async function test() {
  let searchOutput = await api.search("JSDeveloper", true, 2, [{ type: "video" }])
  console.log("init_search", searchOutput)

  let round = 0
  let nextPage: NextPage | undefined = searchOutput.nextPage
  while (!_.isNil(nextPage) && round < 3) {
    searchOutput = await api.getNextPage(nextPage, true, 2)
    console.log("search_result", { searchOutput, round })
    nextPage = searchOutput.nextPage
    round++
  }
}

test()

// Original examples
//
// api.search("JSDeveloper", true, 2, [{ type: "video" }])
//   .then((res) => {
//     console.log("Page1")
//     console.log(res)

//     api.getNextPage(res.nextPage, true, 2)
//       .then((result) => {
//         console.log("Page2")
//         console.log(result)
//         youtube
//           .NextPage(result.nextPage, true, 2)
//           .then((result1) => {
//             console.log("Page3")
//             console.log(result1)
//           })
//           .catch((err) => {
//             console.log(err)
//           })
//       })
//       .catch((err) => {
//         console.log(err)
//       })
//   })
//   .catch((err) => {
//     console.log(err)
//   })

// youtube
//   .GetPlaylistData("RDCLAK5uy_lGZNsVQescoTzcvJkcEhSjpyn_98D4lq0")
//   .then((res) => {
//     console.log("Playlist results")
//     console.log(res)
//   })
//   .catch((err) => {
//     console.log(err)
//   })

// youtube
//   .GetSuggestData()
//   .then((res) => {
//     console.log(res)
//   })
//   .catch((err) => {
//     console.log(err)
//   })

// youtube
//   .GetChannelById(`UCj-Xm8j6WBgKY8OG7s9r2vQ`)
//   .then((res) => {
//     console.log(res)
//   })
//   .catch((err) => {
//     console.log(err)
//   })

// youtube
//   .GetVideoDetails("cC2UqBuFAEY")
//   .then((result) => {
//     console.log(result)
//   })
//   .catch((err) => {
//     console.error(err)
//   })

// youtube
//   .GetShortVideo()
//   .then((shortVideoResult) => {
//     console.log(shortVideoResult)
//   })
//   .catch((err) => {
//     console.log(err)
//   })
