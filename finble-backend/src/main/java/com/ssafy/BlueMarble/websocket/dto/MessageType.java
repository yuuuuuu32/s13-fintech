package com.ssafy.BlueMarble.websocket.dto;

public enum MessageType {
    // 로비/방 관련
    CREATE_ROOM,
    CREATE_ROOM_OK,
    CREATE_ROOM_FAIL,
    ENTER_ROOM,
    ENTER_ROOM_OK,
    ENTER_ROOM_FAIL,
    ENTER_NEW_USER,
    EXIT_USER,
    EXIT_ROOM,
    KICK, //방장이 보낸 강제퇴장 요청
    KICK_USER,//다른 유저 강제퇴장
    KICKED,//내가 강제퇴장

    // 게임 관련
    START_GAME,
    START_GAME_OBSERVE,
    GAME_STATE_CHANGE,
    GAME_RETIRED,
    GAME_END,
    TURN_SKIP,

    // 게임 로직 관련
    TRADE_LAND,
    CONSTRUCT_BUILDING,
    JAIL_EVENT,
    WORLD_TRAVEL_EVENT,
    USE_DICE,
    NTS_EVENT,
    ECONOMIC_HISTORY_UPDATE,

    // 카드 관련
    DRAW_CARD,
    USE_CARD,
    ANGEL_DEFENSE,

}
