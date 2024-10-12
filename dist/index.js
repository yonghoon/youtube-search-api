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
exports.YoutubeSearchApi = void 0;
const axios_1 = __importDefault(require("axios"));
const lodash_1 = __importDefault(require("lodash"));
const youtubeEndpoint = `https://www.youtube.com`;
class YoutubeSearchApi {
    getYoutubeInitData(url) {
        return __awaiter(this, void 0, void 0, function* () {
            const output = {
                initdata: {},
            };
            try {
                const page = yield axios_1.default.get(encodeURI(url));
                const ytInitData = page.data.split("var ytInitialData =");
                if (ytInitData && ytInitData.length > 1) {
                    const data = ytInitData[1].split("</script>")[0].slice(0, -1);
                    if (page.data.split("innertubeApiKey").length > 0) {
                        output.apiToken = page.data
                            .split("innertubeApiKey")[1]
                            .trim()
                            .split(",")[0]
                            .split('"')[2];
                    }
                    if (page.data.split("INNERTUBE_CONTEXT").length > 0) {
                        output.context = JSON.parse(page.data.split("INNERTUBE_CONTEXT")[1].trim().slice(2, -2));
                    }
                    output.initdata = (yield JSON.parse(data));
                    return output;
                }
                else {
                    console.error("cannot_get_init_data");
                    return yield Promise.reject("cannot_get_init_data");
                }
            }
            catch (ex) {
                yield console.error(ex);
                throw ex;
            }
        });
    }
    getYoutubePlayerDetail(url) {
        return __awaiter(this, void 0, void 0, function* () {
            var initdata = {};
            try {
                const page = yield axios_1.default.get(encodeURI(url));
                const ytInitData = yield page.data.split("var ytInitialPlayerResponse =");
                if (ytInitData && ytInitData.length > 1) {
                    const data = yield ytInitData[1].split("</script>")[0].slice(0, -1);
                    initdata = yield JSON.parse(data);
                    return yield Promise.resolve(Object.assign({}, initdata.videoDetails));
                }
                else {
                    console.error("cannot_get_player_data");
                    return yield Promise.reject("cannot_get_player_data");
                }
            }
            catch (ex) {
                yield console.error(ex);
                return yield Promise.reject(ex);
            }
        });
    }
    search(keyword_1) {
        return __awaiter(this, arguments, void 0, function* (keyword, withPlaylist = false, limit = 0, options = []) {
            let endpoint = yield `${youtubeEndpoint}/results?search_query=${keyword}`;
            try {
                if (Array.isArray(options) && options.length > 0) {
                    const type = options.find((option) => option.type);
                    if (typeof type == "object") {
                        if (typeof type.type == "string") {
                            switch (type.type.toLowerCase()) {
                                case "video":
                                    endpoint = `${endpoint}&sp=EgIQAQ%3D%3D`;
                                    break;
                                case "channel":
                                    endpoint = `${endpoint}&sp=EgIQAg%3D%3D`;
                                    break;
                                case "playlist":
                                    endpoint = `${endpoint}&sp=EgIQAw%3D%3D`;
                                    break;
                                case "movie":
                                    endpoint = `${endpoint}&sp=EgIQBA%3D%3D`;
                                    break;
                            }
                        }
                    }
                }
                const page = yield this.getYoutubeInitData(endpoint);
                const contents = lodash_1.default.get(page.initdata, "contents.twoColumnSearchResultsRenderer.primaryContents.sectionListRenderer.contents", []);
                let contToken = {};
                let items = [];
                yield contents.forEach((content) => {
                    const token = lodash_1.default.get(content, "continuationItemRenderer.continuationEndpoint.continuationCommand.token");
                    const rendererContents = lodash_1.default.get(content, "itemSectionRenderer.contents", []);
                    if (!lodash_1.default.isNil(token)) {
                        contToken = token;
                    }
                    else if (!lodash_1.default.isEmpty(rendererContents)) {
                        rendererContents.forEach((renderedContent) => __awaiter(this, void 0, void 0, function* () {
                            if (renderedContent.channelRenderer) {
                                let channelRenderer = renderedContent.channelRenderer;
                                items.push({
                                    id: channelRenderer.channelId,
                                    type: "channel",
                                    thumbnail: channelRenderer.thumbnail,
                                    title: channelRenderer.title.simpleText
                                });
                            }
                            else {
                                let videoRender = renderedContent.videoRenderer;
                                let playListRender = renderedContent.playlistRenderer;
                                if (videoRender && videoRender.videoId) {
                                    items.push(yield this.getVideoRender(renderedContent));
                                }
                                if (withPlaylist) {
                                    if (playListRender && playListRender.playlistId) {
                                        items.push({
                                            id: playListRender.playlistId,
                                            type: "playlist",
                                            thumbnail: playListRender.thumbnails,
                                            title: playListRender.title.simpleText,
                                            length: playListRender.videoCount,
                                            videos: playListRender.videos,
                                            videoCount: playListRender.videoCount,
                                            isLive: false
                                        });
                                    }
                                }
                            }
                        }));
                    }
                });
                const apiToken = page.apiToken;
                const context = page.context;
                const nextPageContext = yield { context: context, continuation: contToken };
                const itemsResult = limit != 0 ? items.slice(0, limit) : items;
                return yield Promise.resolve({
                    items: itemsResult,
                    nextPage: { nextPageToken: apiToken, nextPageContext: nextPageContext }
                });
            }
            catch (ex) {
                yield console.error(ex);
                return yield Promise.reject(ex);
            }
        });
    }
    getNextPage(nextPage_1) {
        return __awaiter(this, arguments, void 0, function* (nextPage, withPlaylist = false, limit = 0) {
            const endpoint = yield `${youtubeEndpoint}/youtubei/v1/search?key=${nextPage.nextPageToken}`;
            try {
                const page = yield axios_1.default.post(encodeURI(endpoint), nextPage.nextPageContext);
                const item1 = page.data.onResponseReceivedCommands[0].appendContinuationItemsAction;
                let items = [];
                item1.continuationItems.forEach((conitem) => {
                    if (conitem.itemSectionRenderer) {
                        conitem.itemSectionRenderer.contents.forEach((content) => __awaiter(this, void 0, void 0, function* () {
                            let videoRender = content.videoRenderer;
                            let playListRender = content.playlistRenderer;
                            if (videoRender && videoRender.videoId) {
                                items.push(yield this.getVideoRender(content));
                            }
                            if (withPlaylist) {
                                if (playListRender && playListRender.playlistId) {
                                    items.push({
                                        id: playListRender.playlistId,
                                        type: "playlist",
                                        thumbnail: playListRender.thumbnails,
                                        title: playListRender.title.simpleText,
                                        length: playListRender.videoCount,
                                        videos: yield this.getPlaylistData(playListRender.playlistId)
                                    });
                                }
                            }
                        }));
                    }
                    else if (conitem.continuationItemRenderer) {
                        nextPage.nextPageContext.continuation =
                            conitem.continuationItemRenderer.continuationEndpoint.continuationCommand.token;
                    }
                });
                const itemsResult = limit != 0 ? items.slice(0, limit) : items;
                return yield Promise.resolve({ items: itemsResult, nextPage });
            }
            catch (ex) {
                yield console.error(ex);
                return yield Promise.reject(ex);
            }
        });
    }
    getPlaylistData(playlistId_1) {
        return __awaiter(this, arguments, void 0, function* (playlistId, limit = 0) {
            const endpoint = `${youtubeEndpoint}/playlist?list=${playlistId}`;
            try {
                const initData = yield this.getYoutubeInitData(endpoint);
                const sectionListRenderer = initData.initdata;
                const metadata = sectionListRenderer.metadata;
                if (sectionListRenderer && sectionListRenderer.contents) {
                    const videoItems = sectionListRenderer.contents
                        .twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content
                        .sectionListRenderer.contents[0].itemSectionRenderer.contents[0]
                        .playlistVideoListRenderer.contents;
                    let items = [];
                    yield videoItems.forEach((item) => {
                        let videoRender = item.playlistVideoRenderer;
                        if (videoRender && videoRender.videoId) {
                            items.push(this.getVideoRender(item));
                        }
                    });
                    const itemsResult = limit != 0 ? items.slice(0, limit) : items;
                    return { items: itemsResult, metadata: metadata };
                }
                else {
                    return yield Promise.reject("invalid_playlist");
                }
            }
            catch (ex) {
                yield console.error(ex);
                return yield Promise.reject(ex);
            }
        });
    }
    getSuggestData() {
        return __awaiter(this, arguments, void 0, function* (limit = 0) {
            const endpoint = yield `${youtubeEndpoint}`;
            try {
                const page = yield this.getYoutubeInitData(endpoint);
                const sectionListRenderer = page.initdata.contents
                    .twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content
                    .richGridRenderer.contents;
                let items = [];
                let otherItems = [];
                yield sectionListRenderer.forEach((item) => __awaiter(this, void 0, void 0, function* () {
                    if (item.richItemRenderer && item.richItemRenderer.content) {
                        let videoRender = item.richItemRenderer.content.videoRenderer;
                        if (videoRender && videoRender.videoId) {
                            items.push(yield this.getVideoRender(item.richItemRenderer.content));
                        }
                        else {
                            otherItems.push(videoRender);
                        }
                    }
                }));
                const itemsResult = limit != 0 ? items.slice(0, limit) : items;
                return yield Promise.resolve({ items: itemsResult });
            }
            catch (ex) {
                yield console.error(ex);
                return yield Promise.reject(ex);
            }
        });
    }
    getChannelById(channelId) {
        return __awaiter(this, void 0, void 0, function* () {
            const endpoint = yield `${youtubeEndpoint}/channel/${channelId}`;
            try {
                const page = yield this.getYoutubeInitData(endpoint);
                const tabs = page.initdata.contents.twoColumnBrowseResultsRenderer.tabs;
                const items = tabs
                    .map((json) => {
                    if (json && json.tabRenderer) {
                        const tabRenderer = json.tabRenderer;
                        const title = tabRenderer.title;
                        const content = tabRenderer.content;
                        return { title, content };
                    }
                })
                    .filter((y) => typeof y != "undefined");
                return yield Promise.resolve(items);
            }
            catch (ex) {
                return yield Promise.reject(ex);
            }
        });
    }
    getVideoDetails(videoId) {
        return __awaiter(this, void 0, void 0, function* () {
            const endpoint = yield `${youtubeEndpoint}/watch?v=${videoId}`;
            try {
                const page = yield this.getYoutubeInitData(endpoint);
                const playerData = yield this.getYoutubePlayerDetail(endpoint);
                const result = yield page.initdata.contents.twoColumnWatchNextResults;
                const firstContent = yield result.results.results.contents[0]
                    .videoPrimaryInfoRenderer;
                const secondContent = yield result.results.results.contents[1]
                    .videoSecondaryInfoRenderer;
                const res = yield {
                    id: playerData.videoId,
                    title: firstContent.title.runs[0].text,
                    thumbnail: playerData.thumbnail,
                    isLive: firstContent.viewCount.videoViewCountRenderer.hasOwnProperty("isLive")
                        ? firstContent.viewCount.videoViewCountRenderer.isLive
                        : false,
                    channel: playerData.author ||
                        secondContent.owner.videoOwnerRenderer.title.runs[0].text,
                    channelId: playerData.channelId,
                    description: playerData.shortDescription,
                    keywords: playerData.keywords,
                    suggestion: result.secondaryResults.secondaryResults.results
                        .filter((y) => y.hasOwnProperty("compactVideoRenderer"))
                        .map((x) => this.getCompactVideoRenderer(x))
                };
                return yield Promise.resolve(res);
            }
            catch (ex) {
                return yield Promise.reject(ex);
            }
        });
    }
    getVideoRender(json) {
        return __awaiter(this, void 0, void 0, function* () {
            try {
                if (json && (json.videoRenderer || json.playlistVideoRenderer)) {
                    let videoRenderer = null;
                    if (json.videoRenderer) {
                        videoRenderer = json.videoRenderer;
                    }
                    else if (json.playlistVideoRenderer) {
                        videoRenderer = json.playlistVideoRenderer;
                    }
                    var isLive = false;
                    if (videoRenderer.badges &&
                        videoRenderer.badges.length > 0 &&
                        videoRenderer.badges[0].metadataBadgeRenderer &&
                        videoRenderer.badges[0].metadataBadgeRenderer.style ==
                            "BADGE_STYLE_TYPE_LIVE_NOW") {
                        isLive = true;
                    }
                    if (videoRenderer.thumbnailOverlays) {
                        videoRenderer.thumbnailOverlays.forEach((thumbnailOverlay) => {
                            if (thumbnailOverlay.thumbnailOverlayTimeStatusRenderer &&
                                thumbnailOverlay.thumbnailOverlayTimeStatusRenderer.style &&
                                thumbnailOverlay.thumbnailOverlayTimeStatusRenderer.style == "LIVE") {
                                isLive = true;
                            }
                        });
                    }
                    const id = videoRenderer.videoId;
                    const thumbnail = videoRenderer.thumbnail;
                    const title = videoRenderer.title.runs[0].text;
                    const shortBylineText = videoRenderer.shortBylineText
                        ? videoRenderer.shortBylineText
                        : "";
                    const lengthText = videoRenderer.lengthText
                        ? videoRenderer.lengthText
                        : "";
                    const channelTitle = videoRenderer.ownerText && videoRenderer.ownerText.runs
                        ? videoRenderer.ownerText.runs[0].text
                        : "";
                    return {
                        id,
                        type: "video",
                        thumbnail,
                        title,
                        channelTitle,
                        shortBylineText,
                        length: lengthText,
                        isLive
                    };
                }
                else {
                    return {};
                }
            }
            catch (ex) {
                throw ex;
            }
        });
    }
    getCompactVideoRenderer(json) {
        return __awaiter(this, void 0, void 0, function* () {
            const compactVideoRendererJson = json.compactVideoRenderer;
            var isLive = false;
            if (compactVideoRendererJson.badges &&
                compactVideoRendererJson.badges.length > 0 &&
                compactVideoRendererJson.badges[0].metadataBadgeRenderer &&
                compactVideoRendererJson.badges[0].metadataBadgeRenderer.style ==
                    "BADGE_STYLE_TYPE_LIVE_NOW") {
                isLive = true;
            }
            return {
                id: compactVideoRendererJson.videoId,
                type: "video",
                thumbnail: compactVideoRendererJson.thumbnail.thumbnails,
                title: compactVideoRendererJson.title.simpleText,
                channelTitle: compactVideoRendererJson.shortBylineText.runs[0].text,
                shortBylineText: compactVideoRendererJson.shortBylineText.runs[0].text,
                length: compactVideoRendererJson.lengthText,
                isLive
            };
        });
    }
    getShortVideo() {
        return __awaiter(this, void 0, void 0, function* () {
            const page = yield this.getYoutubeInitData(youtubeEndpoint);
            const shortResult = yield page.initdata.contents.twoColumnBrowseResultsRenderer.tabs[0].tabRenderer.content.richGridRenderer.contents
                .filter((x) => {
                return x.richSectionRenderer;
            })
                .map((z) => z.richSectionRenderer.content)
                .filter((y) => y.richShelfRenderer)
                .map((u) => u.richShelfRenderer)
                .find((i) => i.title.runs[0].text == "Shorts");
            const res = yield shortResult.contents
                .map((z) => z.richItemRenderer)
                .map((y) => y.content.reelItemRenderer);
            return yield res.map((json) => ({
                id: json.videoId,
                type: "reel",
                thumbnail: json.thumbnail.thumbnails[0],
                title: json.headline.simpleText,
                inlinePlaybackEndpoint: json.inlinePlaybackEndpoint || {}
            }));
        });
    }
}
exports.YoutubeSearchApi = YoutubeSearchApi;
