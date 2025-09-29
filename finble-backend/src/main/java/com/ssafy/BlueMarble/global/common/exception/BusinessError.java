package com.ssafy.BlueMarble.global.common.exception;

import lombok.AllArgsConstructor;
import lombok.Getter;
import org.springframework.http.HttpStatus;

@Getter
@AllArgsConstructor
public enum BusinessError {
    //Auth
    INVALID_TOKEN(HttpStatus.FORBIDDEN, "유효하지 않은 토큰입니다."),
    TOKEN_DELETE_FAIL(HttpStatus.INTERNAL_SERVER_ERROR, "토큰 삭제 실패"),
    INVALID_GOOGLE_TOKEN(HttpStatus.BAD_REQUEST, "구글 토큰 검증 실패"),

    //유저
    USER_ID_NOT_FOUND(HttpStatus.BAD_REQUEST, "유저 id가 잘못되었습니다."),
    USER_EMAIL_NOT_FOUND(HttpStatus.BAD_REQUEST, "유저 이메일이 잘못되었습니다."),
    USER_CREATION_FAIL(HttpStatus.INTERNAL_SERVER_ERROR, "사용자 생성 실패"),
    NICKNAME_DUPLICATED(HttpStatus.BAD_REQUEST, "닉네임 중복"),

    //친구
    FRIEND_ID_NOT_FOUND(HttpStatus.BAD_REQUEST, "친구 id가 잘못되었습니다."),
    ALREADY_FRIEND(HttpStatus.BAD_REQUEST, "이미 친구로 등록되거나 요청한 유저입니다."),
    NOT_SELF_REQUEST(HttpStatus.BAD_REQUEST, "자신을 친구로 등록할 수 없습니다."),
    NOT_MY_FRIEND(HttpStatus.FORBIDDEN, "권한이 없습니다."),
    FRIEND_REQUEST_ID_NOT_FOUND(HttpStatus.BAD_REQUEST, "친구 요청 id가 잘못되었습니다."),
    FCM_ERROR(HttpStatus.BAD_GATEWAY, "초대가 동작하지 않습니다."),
    PLAYER_NOT_INVITABLE(HttpStatus.BAD_REQUEST, "친구가 게임 중 입니다."),

    //아이템
    ITEM_ID_NOT_FOUND(HttpStatus.BAD_REQUEST, "아이템을 찾을 수 없습니다."),
    CATEGORY_MISMATCH(HttpStatus.BAD_REQUEST, "카테고리 불일치"),

    //인벤토리
    INVENTORY_ID_NOT_FOUND(HttpStatus.INTERNAL_SERVER_ERROR, "인벤토리를 찾을 수 없습니다."),

    //방
    CREATE_ROOM_FAIL(HttpStatus.BAD_REQUEST, "요청이 잘못되었습니다."),
    ENTER_ROOM_FAIL(HttpStatus.BAD_REQUEST, "입장할 수 없는 방입니다."),
    ROOM_NAME_NULL(HttpStatus.BAD_REQUEST, "방 이름은 공백일 수 없습니다"),
    ROOM_ID_NOT_FOUND(HttpStatus.BAD_REQUEST, "방 id를 확인하세요"),
    ROOM_NOT_EXIST(HttpStatus.NOT_FOUND, "입장 가능한 방이 없습니다"),

    //투표
    INVALID_VOTE(HttpStatus.BAD_REQUEST, "유효한 투표가 아닙니다."),
    
    //게임
    LAND_NOT_FOUND(HttpStatus.BAD_REQUEST, "땅을 찾을 수 없습니다."),
    INSUFFICIENT_MONEY(HttpStatus.BAD_REQUEST, "잔액이 부족합니다."),
    USER_NOT_FOUND(HttpStatus.BAD_REQUEST, "사용자를 찾을 수 없습니다."),
    INVALID_JAIL_STATE(HttpStatus.BAD_REQUEST, "감옥 상태가 올바르지 않습니다."),
    INVALID_TURN(HttpStatus.BAD_REQUEST, "현재 사용자의 턴이 아닙니다"),
    INVALID_BEHAVIOR(HttpStatus.BAD_REQUEST,"비정상적인 동작입니다."),
    SPECIAL_CANNOT_BUILD(HttpStatus.BAD_REQUEST, "특별땅에는 건물을 지을 수 없습니다."),
    INVALID_BUILDING_TYPE(HttpStatus.BAD_REQUEST, "유효하지 않은 건물 타입입니다."),
    MAX_BUILDING_REACHED(HttpStatus.BAD_REQUEST, "최대 건물 레벨에 도달했습니다."),
    CANNOT_TRADE(HttpStatus.BAD_REQUEST, "주인이 없어 거래할 수 없습니다."),
    CANNOT_CONSTRUCT(HttpStatus.BAD_REQUEST, "건물을 지을 수 없는 땅 입니다.")
    ;


    private final HttpStatus httpStatus;

    private final String message;

}