package com.ssafy.BlueMarble.websocket.dto;

public enum MessageType {
    // 로비/방 관련
    CREATE_ROOM,
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
    ROLE_ASSIGNMENT,
    GAME_END,
}
