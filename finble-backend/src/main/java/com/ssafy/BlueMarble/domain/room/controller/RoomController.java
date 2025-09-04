package com.ssafy.BlueMarble.domain.room.controller;

import com.ssafy.BlueMarble.domain.room.dto.FastStartResponse;
import com.ssafy.BlueMarble.domain.room.dto.RoomListDTO;
import com.ssafy.BlueMarble.domain.room.service.RoomService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/room")
@Tag(name = "03.Room", description = "방 관련 API")
public class RoomController {

    private final RoomService roomService;

    @GetMapping("/list")
    @Operation(summary = "게임방 조회", description = "방 검색할 땐 param에 searchKey에 이름 담아서 요청")
    public ResponseEntity<Page<RoomListDTO>> getRoomList(
            @PageableDefault(size=10) Pageable pageable,
            @RequestParam(required = false) String searchKey
    ) {
        Page<RoomListDTO> roomList = roomService.getRoomList(pageable, searchKey);
        return ResponseEntity.ok(roomList);
    }

    @GetMapping("/fast-start")
    @Operation(summary = "빠른 시작", description = "입장할 수 있는 방 id 1개 반환")
    public ResponseEntity<FastStartResponse> fastStart(){
        FastStartResponse result = roomService.fastStart();
        return ResponseEntity.ok(result);
    }
}
