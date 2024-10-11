"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const lodash_1 = __importDefault(require("lodash"));
const __1 = require("..");
const api = new __1.YoutubeSearchApi();
function test() {
    return __awaiter(this, void 0, void 0, function* () {
        let searchOutput = yield api.search("JSDeveloper", true, 2, [{ type: "video" }]);
        console.log("init_search", searchOutput);
        let round = 0;
        let nextPage = searchOutput.nextPage;
        while (!lodash_1.default.isNil(nextPage) && round < 3) {
            searchOutput = yield api.getNextPage(nextPage, true, 2);
            console.log("search_result", { searchOutput, round });
            nextPage = searchOutput.nextPage;
            round++;
        }
    });
}
test();
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
