import { useState, useEffect } from "react";
import { useGameStore } from "../store/useGameStore.ts";
import { useNavigate } from "react-router-dom";
import type { TileData } from "../data/boardData.ts";
import { useUserStore } from "../../../stores/useUserStore";
import {
  Modal,
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemButton,
  ListItemText,
  Checkbox,
  FormControlLabel,
  FormGroup,
  Tooltip,
} from "@mui/material";
import styles from "./GameUI.module.css";
import ToastContainer from "./ToastContainer.tsx";

import p1_icon from "/assets/player_slime.png";
import p2_icon from "/assets/player_cat.png";
import p3_icon from "/assets/player_robot.png";
import p4_icon from "/assets/player_goblin.png";

const BAIL_AMOUNT = 500000;

const calculateTotalAssets = (player, board: TileData[]) => {
  const resolveTotalAsset = (value: unknown): number | undefined => {
    if (typeof value === "number" && !Number.isNaN(value)) return value;
    if (typeof value === "string" && value.trim() !== "") {
      const parsed = Number(value);
      return Number.isNaN(parsed) ? undefined : parsed;
    }
    return undefined;
  };

  const serverTotalAsset = resolveTotalAsset(player.totalAsset)
    ?? resolveTotalAsset(player.totalasset);

  if (serverTotalAsset !== undefined) {
    return serverTotalAsset;
  }

  const propertyValue = player.properties.reduce((sum, index) => {
    const tile = board[index];
    if (!tile) return sum;

    // 서버 데이터 구조에 맞게 landPrice 사용
    let value = tile.landPrice || tile.price || 0;

    // 건물 가치 추가
    if (tile.buildings && tile.buildings.level > 0) {
      const housePrice = tile.housePrice || 0;
      const buildingPrice = tile.buildingPrice || 0;
      const hotelPrice = tile.hotelPrice || 0;

      switch (tile.buildings.level) {
        case 1: // 주택
          value += housePrice;
          break;
        case 2: // 빌딩
          value += housePrice + buildingPrice;
          break;
        case 3: // 호텔
          value += housePrice + buildingPrice + hotelPrice;
          break;
      }
    }

    return sum + value;
  }, 0);
  return player.money + propertyValue;
};

// BuyPropertyModalContent - develop 로직 + 디자인 적용
const BuyPropertyModalContent = ({
  modal,
  buyPropertyWithItems,
  endTurn,
  currentPlayer,
  applyEconomicMultiplier,
}) => {
  const [selectedItems, setSelectedItems] = useState({
    land: false, // 땅도 선택사항
    house: false,
    building: false,
    hotel: false,
  });

  const tile = modal.tile;
  // 서버 데이터 구조에 맞게 가격 추출
  const baseLandPrice = tile?.landPrice || tile?.price || 0;
  const baseHousePrice = tile?.housePrice || 0;
  const baseBuildingPrice = tile?.buildingPrice || 0;
  const baseHotelPrice = tile?.hotelPrice || 0;

  // Adjusted prices using the multiplier function
  const landPrice = applyEconomicMultiplier(
    baseLandPrice,
    "propertyPriceMultiplier"
  );
  const housePrice = applyEconomicMultiplier(
    baseHousePrice,
    "buildingCostMultiplier"
  );
  const buildingPrice = applyEconomicMultiplier(
    baseBuildingPrice,
    "buildingCostMultiplier"
  );
  const hotelPrice = applyEconomicMultiplier(
    baseHotelPrice,
    "buildingCostMultiplier"
  );

  const handleItemChange =
    (item: string) => (event: React.ChangeEvent<HTMLInputElement>) => {
      const isChecked = event.target.checked;
      setSelectedItems((prev) => {
        const newState = { ...prev, [item]: isChecked };

        // Unchecking an item should uncheck all subsequent items
        if (!isChecked) {
          if (item === "land") {
            newState.house = false;
            newState.building = false;
            newState.hotel = false;
          }
          if (item === "house") {
            newState.building = false;
            newState.hotel = false;
          }
          if (item === "building") {
            newState.hotel = false;
          }
        }
        return newState;
      });
    };

  const calculateTotal = () => {
    let total = 0;
    if (selectedItems.land) total += landPrice;
    if (selectedItems.house) total += housePrice;
    if (selectedItems.building) total += buildingPrice;
    if (selectedItems.hotel) total += hotelPrice;
    return total;
  };

  const totalCost = calculateTotal();
  const canAfford = currentPlayer?.money >= totalCost;
  const hasSelectedItems = Object.values(selectedItems).some((item) => item);

  const handlePurchase = () => {
    // GameStore의 buyProperty를 사용하지 않고 직접 구매 로직 구현
    // 선택된 항목들과 총 비용으로 구매 처리
    const purchaseData = {
      selectedItems,
      totalCost,
      tile,
    };

    // 커스텀 구매 함수 호출
    // 턴 종료는 서버 응답(CONSTRUCT_BUILDING)에서 처리됨
    buyPropertyWithItems(purchaseData);
  };

  return (
    <>
      <Typography variant="h5" component="h2" fontWeight="bold">
        {tile?.name}
      </Typography>
      <Typography sx={{ mt: 2, mb: 3 }}>구매할 항목을 선택하세요:</Typography>

      <FormGroup sx={{ alignItems: "flex-start" }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={selectedItems.land}
              onChange={handleItemChange("land")}
              sx={{ color: "#00ffff", "&.Mui-checked": { color: "#00FFFF" } }}
            />
          }
          label={
            <Box>
              <Typography className={styles.formGroupLabel}>땅 증서</Typography>
              <Typography className={styles.formGroupLabel}>
                {landPrice.toLocaleString()}원
              </Typography>
            </Box>
          }
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={selectedItems.house}
              onChange={handleItemChange("house")}
              disabled={!selectedItems.land}
              sx={{ color: "#00ffff", "&.Mui-checked": { color: "#00FFFF" } }}
            />
          }
          label={
            <Box>
              <Typography
                className={`${styles.formGroupLabel} ${!selectedItems.land ? styles.formGroupLabelDisabled : ""
                  }`}
              >
                주택 {!selectedItems.land && "(땅 구매 필요)"}
              </Typography>
              <Typography
                className={`${styles.formGroupLabel} ${!selectedItems.land ? styles.formGroupLabelDisabled : ""
                  }`}
              >
                {housePrice.toLocaleString()}원
              </Typography>
            </Box>
          }
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={selectedItems.building}
              onChange={handleItemChange("building")}
              disabled={!selectedItems.house}
              sx={{ color: "#00ffff", "&.Mui-checked": { color: "#00FFFF" } }}
            />
          }
          label={
            <Box>
              <Typography
                className={`${styles.formGroupLabel} ${!selectedItems.house ? styles.formGroupLabelDisabled : ""
                  }`}
              >
                빌딩 {!selectedItems.house && "(주택 구매 필요)"}
              </Typography>
              <Typography
                className={`${styles.formGroupLabel} ${!selectedItems.house ? styles.formGroupLabelDisabled : ""
                  }`}
              >
                {buildingPrice.toLocaleString()}원
              </Typography>
            </Box>
          }
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={selectedItems.hotel}
              onChange={handleItemChange("hotel")}
              disabled={!selectedItems.building}
              sx={{ color: "#00ffff", "&.Mui-checked": { color: "#00FFFF" } }}
            />
          }
          label={
            <Box>
              <Typography
                className={`${styles.formGroupLabel} ${!selectedItems.building ? styles.formGroupLabelDisabled : ""
                  }`}
              >
                호텔 {!selectedItems.building && "(빌딩 구매 필요)"}
              </Typography>
              <Typography
                className={`${styles.formGroupLabel} ${!selectedItems.building ? styles.formGroupLabelDisabled : ""
                  }`}
              >
                {hotelPrice.toLocaleString()}원
              </Typography>
            </Box>
          }
        />
      </FormGroup>

      <Box className={styles.totalCostBox}>
        <Typography className={styles.totalCostText}>
          {hasSelectedItems
            ? `총 비용: ${totalCost.toLocaleString()}원`
            : "선택된 항목이 없습니다"}
        </Typography>
        <Typography
          className={`${styles.cashText} ${hasSelectedItems
            ? canAfford
              ? styles.cashTextSuccess
              : styles.cashTextError
            : ""
            }`}
        >
          보유 현금: {currentPlayer?.money.toLocaleString()}원
          {hasSelectedItems && !canAfford && " (현금 부족)"}
        </Typography>
      </Box>

      <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "center" }}>
        {hasSelectedItems && (
          <Button
            variant="contained"
            onClick={handlePurchase}
            disabled={!canAfford}
          >
            구매 ({totalCost.toLocaleString()}원)
          </Button>
        )}
        <Button variant="outlined" onClick={endTurn}>
          {hasSelectedItems ? "패스" : "구매하지 않음"}
        </Button>
      </Box>
    </>
  );
};

// AcquirePropertyModalContent
const AcquirePropertyModalContent = ({
  modal,
  acquireProperty,
  payToll,
  currentPlayer,
  endTurn,
}) => {
  const isPaidToll = modal.isPaidToll; // 통행료가 이미 지불되었는지 확인

  return (
    <>
      <Typography variant="h5" component="h2" fontWeight="bold">
        {modal.tile?.name} 인수
      </Typography>
      {isPaidToll && (
        <Typography sx={{ mt: 2, color: "success.main" }}>
          ✓ 통행료 지불 완료
        </Typography>
      )}
      {!isPaidToll && (
        <Typography sx={{ mt: 2 }}>
          통행료: {modal.toll?.toLocaleString()}원
        </Typography>
      )}
      <Typography sx={{ mt: 1 }}>
        인수 비용: {modal.acquireCost?.toLocaleString()}원
      </Typography>
      <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "center" }}>
        <Button
          variant="contained"
          onClick={() => {
            acquireProperty();
            endTurn();
          }}
          disabled={(currentPlayer?.money || 0) < (modal.acquireCost || 0)}
        >
          인수
        </Button>
        {isPaidToll ? (
          <Button variant="outlined" onClick={endTurn}>
            인수 거부
          </Button>
        ) : (
          <Button
            variant="outlined"
            onClick={() => {
              payToll();
              endTurn();
            }}
          >
            통행료만 지불
          </Button>
        )}
      </Box>
    </>
  );
};

// ChanceCardModalContent
const ChanceCardModalContent = ({ modal }) => (
  <>
    <Typography variant="h5" component="h2" fontWeight="bold">
      찬스!
    </Typography>
    <Typography sx={{ mt: 2 }}>{modal.text}</Typography>
    <Button sx={{ mt: 3 }} variant="contained" onClick={modal.onConfirm}>
      확인
    </Button>
  </>
);

// InfoModalContent
const InfoModalContent = ({ modal, endTurn }) => (
  <>
    <Typography variant="h6" component="h2">
      알림
    </Typography>
    <Typography sx={{ mt: 2 }}>{modal.text}</Typography>
    <Button
      sx={{ mt: 3 }}
      variant="contained"
      onClick={modal.onConfirm || endTurn}
    >
      확인
    </Button>
  </>
);

// JailModalContent
const JailModalContent = ({
  payBail,
  handleJail,
  BAIL_AMOUNT,
  currentPlayer,
}) => {
  const remainingTurns = currentPlayer?.jailTurns || 0;

  return (
    <>
      <Typography variant="h5" component="h2">
        감옥
      </Typography>
      <Typography sx={{ mt: 2 }}>
        {remainingTurns > 0
          ? `${remainingTurns}턴 동안 갇혀있게 됩니다.`
          : "3턴 동안 갇혀있게 됩니다."}
      </Typography>

      <Typography sx={{ mt: 1 }}>
        보석금을 내고 즉시 탈출할 수 있습니다.
      </Typography>

      <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "center" }}>
        <Button variant="contained" onClick={payBail}>
          보석금 ({BAIL_AMOUNT.toLocaleString()}원)
        </Button>
        <Button variant="outlined" onClick={handleJail}>
          머물기
        </Button>
      </Box>
    </>
  );
};

// NtsModalContent (국세청 세금 납부)
const NtsModalContent = ({ modal }) => (
  <>
    <Typography
      variant="h5"
      component="h2"
      sx={{ color: "#e53e3e", fontWeight: "bold" }}
    >
      🏛️ 국세청
    </Typography>
    <Typography sx={{ mt: 2, fontSize: "1.1rem", whiteSpace: "pre-line" }}>
      {modal.text}
    </Typography>
    {modal.taxAmount && (
      <Box
        sx={{
          mt: 2,
          p: 2,
          bgcolor: "#fee2e2",
          borderRadius: 1,
          border: "1px solid #fca5a5",
        }}
      >
        <Typography
          sx={{ fontSize: "1rem", color: "#dc2626", textAlign: "center" }}
        >
          세금: <strong>{modal.taxAmount.toLocaleString()}원</strong>
        </Typography>
      </Box>
    )}
    <Button
      sx={{ mt: 3, width: "100%" }}
      variant="contained"
      color="error"
      onClick={modal.onConfirm}
    >
      세금 납부하고 턴 종료
    </Button>
  </>
);

// JailEscapeModalContent (감옥 탈출 완료)
const JailEscapeModalContent = ({ modal }) => (
  <>
    <Typography
      variant="h5"
      component="h2"
      sx={{ color: "#22c55e", fontWeight: "bold" }}
    >
      🔓 감옥 탈출!
    </Typography>
    <Typography sx={{ mt: 2, fontSize: "1.2rem", textAlign: "center" }}>
      {modal.text}
    </Typography>
    <Typography
      sx={{
        mt: 1,
        fontSize: "1rem",
        color: "text.secondary",
        textAlign: "center",
      }}
    >
      이번 턴에 주사위를 굴릴 수 있습니다.
    </Typography>
    <Button
      sx={{ mt: 3, width: "100%" }}
      variant="contained"
      color="success"
      onClick={modal.onConfirm}
    >
      확인 - 주사위 굴리기
    </Button>
  </>
);

// ExpoModalContent
const ExpoModalContent = ({ modal, selectExpoProperty }) => (
  <>
    <Typography variant="h5" component="h2">
      박람회 개최!
    </Typography>
    <Typography sx={{ mt: 2 }}>
      소유한 땅 중 하나의 통행료를 2배로 올릴 수 있습니다.
    </Typography>
    <Box
      sx={{
        maxHeight: 200,
        overflow: "auto",
        mt: 2,
        border: "1px solid #ccc",
        borderRadius: 1,
      }}
    >
      <List>
        {modal.properties?.length > 0 ? (
          modal.properties?.map((prop) => (
            <ListItem disablePadding key={prop.index}>
              <ListItemButton onClick={() => selectExpoProperty(prop.index)}>
                <ListItemText primary={prop.name} />
              </ListItemButton>
            </ListItem>
          ))
        ) : (
          <ListItem>
            <ListItemText primary="선택할 땅이 없습니다." />
          </ListItem>
        )}
      </List>
    </Box>
  </>
);

// ManagePropertyModalContent
const ManagePropertyModalContent = ({
  modal,
  endTurn,
  buyPropertyWithItems,
  currentPlayer,
}) => {
  const [selectedItems, setSelectedItems] = useState({
    house: false,
    building: false,
    hotel: false,
  });

  const tile = modal.tile;
  const currentLevel = tile?.buildings?.level ?? 0;

  // 각 건물 타입별 가격 (서버에서 오는 값 사용)
  const housePrice = tile?.housePrice || 0;
  const buildingPrice = tile?.buildingPrice || 0;
  const hotelPrice = tile?.hotelPrice || 0;

  // 현재 소유한 건물들 확인
  const hasHouse = currentLevel >= 1;
  const hasBuilding = currentLevel >= 2;
  const hasHotel = currentLevel >= 3;

  // 총 비용 계산
  const totalCost =
    (selectedItems.house && !hasHouse ? housePrice : 0) +
    (selectedItems.building && !hasBuilding ? buildingPrice : 0) +
    (selectedItems.hotel && !hasHotel ? hotelPrice : 0);

  const canAfford = currentPlayer?.money >= totalCost;
  const hasSelection =
    selectedItems.house || selectedItems.building || selectedItems.hotel;

  const handleItemChange = (item) => {
    setSelectedItems((prev) => ({
      ...prev,
      [item]: !prev[item],
    }));
  };

  const handlePurchase = () => {
    if (hasSelection && canAfford) {
      buyPropertyWithItems({
        selectedItems,
        totalCost,
        tile,
      });
      // 턴 종료는 서버 응답(CONSTRUCT_BUILDING)에서 처리됨
    }
  };

  return (
    <>
      <Typography variant="h5" component="h2">
        {tile?.name} 건물 관리
      </Typography>
      <Typography sx={{ mt: 2 }}>구매할 건물을 선택하세요:</Typography>

      <Box sx={{ mt: 2, display: "flex", flexDirection: "column" }}>
        <FormControlLabel
          control={
            <Checkbox
              checked={hasHouse || selectedItems.house}
              onChange={() => handleItemChange("house")}
              sx={{ color: "#00ffff", "&.Mui-checked": { color: "#00FFFF" } }}
              disabled={hasHouse}
            />
          }
          label={
            <Typography sx={{ color: "#ffffff" }}>
              `주택 (${housePrice.toLocaleString()}원) ${hasHouse ? "✓ 보유중" : ""
              }`
            </Typography>
          }
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={hasBuilding || selectedItems.building}
              onChange={() => handleItemChange("building")}
              sx={{ color: "#00ffff", "&.Mui-checked": { color: "#00FFFF" } }}
              disabled={hasBuilding}
            />
          }
          label={
            <Typography sx={{ color: "#ffffff" }}>
              `빌딩 (${buildingPrice.toLocaleString()}원) ${hasBuilding ? "✓ 보유중" : ""
              }`
            </Typography>
          }
        />

        <FormControlLabel
          control={
            <Checkbox
              checked={hasHotel || selectedItems.hotel}
              onChange={() => handleItemChange("hotel")}
              sx={{ color: "#00ffff", "&.Mui-checked": { color: "#00FFFF" } }}
              disabled={hasHotel}
            />
          }
          label={
            <Typography sx={{ color: "#ffffff" }}>
              `호텔 (${hotelPrice.toLocaleString()}원) ${hasHotel ? "✓ 보유중" : ""
              }`
            </Typography>
          }
        />
      </Box>

      <Typography sx={{ mt: 2, fontWeight: "bold" }}>
        총 비용: {totalCost.toLocaleString()}원
      </Typography>
      <Typography sx={{ color: "gray", fontSize: "0.9rem" }}>
        보유 자금: {currentPlayer?.money?.toLocaleString()}원
      </Typography>

      <Box sx={{ mt: 3, display: "flex", gap: 2, justifyContent: "center" }}>
        <Button
          variant="contained"
          onClick={handlePurchase}
          disabled={!hasSelection || !canAfford}
        >
          구매
        </Button>
        <Button variant="outlined" onClick={endTurn}>
          구매하지 않음
        </Button>
      </Box>
    </>
  );
};

// BuySpecialLandModalContent
const BuySpecialLandModalContent = ({
  modal,
  buySpecialLand,
  endTurn,
  currentPlayer,
}) => {
  const tile = modal.tile;
  const landPrice = modal.landPrice || tile?.landPrice || tile?.price || 0;
  const canAfford = currentPlayer?.money >= landPrice;

  const handlePurchase = () => {
    buySpecialLand(tile, landPrice);
    endTurn(); // 구매 후 턴 종료
  };

  return (
    <>
      <Typography variant="h5" component="h2" fontWeight="bold">
        {tile?.name}
      </Typography>
      <Typography className={styles.specialLandTitle}>
        🏛️ SSAFY 특별 땅
      </Typography>
      <Typography className={styles.specialLandDescription}>
        이 땅은 건물 건설이 불가능하며, 땅만 구매할 수 있습니다.
      </Typography>

      <Box className={styles.specialLandPriceBox}>
        <Typography variant="h6">
          구매 가격: {landPrice.toLocaleString()}원
        </Typography>
        <Typography
          variant="body2"
          className={canAfford ? styles.cashTextSuccess : styles.cashTextError}
        >
          보유 현금: {currentPlayer?.money.toLocaleString()}원
          {!canAfford && " (현금 부족)"}
        </Typography>
      </Box>

      <Box className={styles.specialLandActions}>
        <Button
          variant="contained"
          onClick={handlePurchase}
          disabled={!canAfford}
        >
          구매 ({landPrice.toLocaleString()}원)
        </Button>
        <Button variant="outlined" onClick={endTurn}>
          구매하지 않음
        </Button>
      </Box>
    </>
  );
};

// GameOverModalContent - develop 로직 유지
const GameOverModalContent = ({
  winner,
  handleGoToLobby,
  players,
  board,
  shouldShowGameOverByTurns,
  currentUserId,
}) => {
  // 승자가 없고 턴 제한으로 게임이 끝난 경우 fallback 승자 결정
  let finalWinner = winner;
  let gameEndReason = "";

  if (!winner && shouldShowGameOverByTurns) {
    const alivePlayers = players.filter((p) => p.money >= 0);
    if (alivePlayers.length > 0) {
      finalWinner = alivePlayers.reduce((prev, current) => {
        const prevAssets = calculateTotalAssets(prev, board);
        const currentAssets = calculateTotalAssets(current, board);
        return prevAssets > currentAssets ? prev : current;
      });
      gameEndReason = "턴 제한으로 인한 자산 기준 승리";
    }
  } else if (winner) {
    gameEndReason = "게임 진행 중 승리";
  }

  // 현재 사용자가 승리자인지 확인 (디버깅 로그 추가)
  console.log("🏆 [GameOverModal] 승리자 판단 디버깅:", {
    finalWinner: finalWinner,
    finalWinnerId: finalWinner?.id,
    finalWinnerIdType: typeof finalWinner?.id,
    currentUserId: currentUserId,
    currentUserIdType: typeof currentUserId,
    directComparison: finalWinner?.id === currentUserId,
    stringComparison: String(finalWinner?.id) === String(currentUserId)
  });

  const isWinner = finalWinner && String(finalWinner.id) === String(currentUserId);
  const isLoser = !isWinner && finalWinner !== null;

  console.log("🏆 [GameOverModal] 최종 판단 결과:", {
    isWinner: isWinner,
    isLoser: isLoser,
    finalWinnerExists: !!finalWinner
  });

  return (
    <Box className={styles.gameOverModal}>
      <Typography variant="h4" component="h2" sx={{ fontFamily: "Galmuri14" }} className={styles.gameOverTitle}>
        {isWinner ? "🎉 게임 종료!" : isLoser ? "😢 게임 종료" : "🏁 게임 종료"}
      </Typography>
      <Typography sx={{ mt: 2, fontSize: "1.5rem", fontFamily: "Galmuri14", fontWeight: "bold" }}className={styles.gameOverMessage}>
        {isWinner
          ? "축하합니다! 승리했습니다!"
          : isLoser
          ? "아쉽게도 패배했습니다..."
          : "승자 없이 게임이 종료되었습니다."}
      </Typography>

      {/* 승리자 정보는 패배자에게도 표시 */}
      {finalWinner && !isWinner && (
        <Typography sx={{ mt: 1, fontSize: "1.2rem", fontFamily: "Galmuri14" }} className={styles.gameOverAssets}>
          🏆 {finalWinner.name}님이 최종 승리했습니다!
        </Typography>
      )}

      {gameEndReason && (
        <Typography sx={{ mt: 1, fontSize: "1.2rem", fontFamily: "Galmuri14"}}className={styles.gameOverAssets}>
          {gameEndReason}
        </Typography>
      )}

      {/* 총 자산은 승리자에게만 표시 */}
      {finalWinner && isWinner && (
        <Typography sx={{ fontFamily: "Galmuri14" }}className={styles.gameOverAssets}>
          🏆 총 자산:{" "}
          {calculateTotalAssets(finalWinner, board).toLocaleString()}원
        </Typography>
      )}

      <Button
        sx={{ mt: 3, fontFamily: "Galmuri14" }}
        variant="contained"
        size="large"
        onClick={handleGoToLobby}
        color={isWinner ? "primary" : isLoser ? "secondary" : "primary"}
      >
        로비로 돌아가기
      </Button>
    </Box>
  );
};

export function GameUI() {
  const { userInfo } = useUserStore();
  const players = useGameStore((state) => state.players);
  const characterImages = {
    p1: p1_icon,
    p2: p2_icon,
    p3: p3_icon,
    p4: p4_icon,
  };
  const currentPlayerIndex = useGameStore((state) => state.currentPlayerIndex);
  const gamePhase = useGameStore((state) => state.gamePhase);
  const winnerId = useGameStore((state) => state.winnerId);
  const modal = useGameStore((state) => state.modal);
  const totalTurns = useGameStore((state) => state.totalTurns);
  const currentTurn = useGameStore((state) => state.currentTurn);
  const board = useGameStore((state) => state.board);
  const economicHistory = useGameStore((state) => state.economicHistory);

  // 경제역사 상태 디버깅
  useEffect(() => {
    console.log("🏦 [GameUI] economicHistory 상태 체크:", economicHistory);
  }, [economicHistory]);
  const setDicePower = useGameStore((state) => state.setDicePower);
  const buyPropertyWithItems = useGameStore(
    (state) => state.buyPropertyWithItems
  );
  const applyEconomicMultiplier = useGameStore(
    (state) => state.applyEconomicMultiplier
  );
  const endTurn = useGameStore((state) => state.endTurn);
  const acquireProperty = useGameStore((state) => state.acquireProperty);
  const payToll = useGameStore((state) => state.payToll);
  const payBail = useGameStore((state) => state.payBail);
  const handleJail = useGameStore((state) => state.handleJail);
  const selectExpoProperty = useGameStore((state) => state.selectExpoProperty);
  const cancelWorldTravel = useGameStore((state) => state.cancelWorldTravel);
  const buySpecialLand = useGameStore((state) => state.buySpecialLand);

  const navigate = useNavigate();

  // 파워 게이지 관련 상태 제거 (즉시 실행으로 변경)
  const [timeLeft, setTimeLeft] = useState(30);

  const winner = winnerId ? players.find((p) => p.id === winnerId) : null;
  const isGameOver = gamePhase === "GAME_OVER";
  const currentPlayer = players[currentPlayerIndex];
  const isMyTurn = currentPlayer?.id === userInfo?.userId;

  // 게임 종료 조건 fallback 체크 (20턴 초과 시)
  const shouldShowGameOverByTurns = currentTurn >= totalTurns;
  const shouldShowGameOver = isGameOver || shouldShowGameOverByTurns;

  useEffect(() => {
    console.log(
      "🎮 GameUI useEffect triggered - isMyTurn:",
      isMyTurn,
      "currentPlayerIndex:",
      currentPlayerIndex,
      "gamePhase:",
      gamePhase
    );
    if (isMyTurn) {
      console.log("⏰ Starting timer for my turn");
      setTimeLeft(30);
      const timer = setInterval(() => {
        setTimeLeft((prevTime) => {
          if (prevTime <= 1) {
            clearInterval(timer);
            return 0;
          }
          return prevTime - 1;
        });
      }, 1000);
      return () => clearInterval(timer);
    } else {
      setTimeLeft(30); // Reset for others as well
    }
  }, [isMyTurn, currentPlayerIndex, gamePhase]); // Also depend on gamePhase

  // 파워 게이지 정리 useEffect 제거

  const handleDiceClick = () => {
    if (gamePhase !== "WAITING_FOR_ROLL" || !isMyTurn) return;
    // 고정된 파워값(50)으로 즉시 주사위 굴리기
    setDicePower(50);
    window.dispatchEvent(new Event("roll-dice"));
  };

  const handleGoToLobby = () => {
    navigate("/lobby");
  };


  // 경제역사 상태 디버깅
  useEffect(() => {
    console.log("🏦 [GameUI] economicHistory 상태 체크:", economicHistory);
  }, [economicHistory]);

  return (
    <Box
      sx={{
        position: "absolute",
        top: 0,
        left: 0,
        width: "100%",
        height: "100%",
        pointerEvents: "none",
        color: "white",
        zIndex: 999,
      }}
    >
      <Box
        sx={{
          position: "absolute",
          top: 20,
          left: "50%",
          transform: "translateX(-50%)",
          p: "10px 20px",
          bgcolor: "rgba(0,0,0,0.7)",
          borderRadius: "10px",
          pointerEvents: "auto",
        }}
      >
        <Typography
          variant="h5"
          fontWeight="bold"
          sx={{ fontFamily: "Galmuri14" }}
        >
          라운드 {currentTurn} - {currentPlayer?.name}님 차례
        </Typography>
        <Typography variant="body2" sx={{ fontFamily: "Galmuri14", mt: 0.5 }}>
          플레이어 순서: ({currentPlayerIndex + 1}/{players.length}) | 전체 라운드: {currentTurn}/{totalTurns}
        </Typography>
        {isMyTurn && timeLeft > 5 && (
          <Typography variant="h6" sx={{ fontFamily: "Galmuri14" }}>
            남은 시간: {timeLeft}초
          </Typography>
        )}
        {economicHistory && (
          <Tooltip
            title={
              <Box sx={{ p: 1 }}>
                <Typography
                  variant="h6"
                  sx={{
                    fontWeight: "bold",
                    mb: 1,
                    color: economicHistory.isBoom ? "#4CAF50" : "#FF9800",
                  }}
                >
                  {economicHistory.periodName} - {economicHistory.effectName}
                </Typography>
                <Typography variant="body2" sx={{ mb: 1, lineHeight: 1.4 }}>
                  {economicHistory.description}
                </Typography>
                <Typography variant="body2" sx={{ fontWeight: "bold", mb: 1 }}>
                  {economicHistory.isBoom ? "📈 호황" : "📉 불황"}
                </Typography>
                {(economicHistory.salaryMultiplier ||
                  economicHistory.propertyPriceMultiplier ||
                  economicHistory.buildingCostMultiplier) && (
                  <Box sx={{ mt: 1, pt: 1, borderTop: "1px solid #ddd" }}>
                    <Typography
                      variant="caption"
                      sx={{ fontWeight: "bold", display: "block", mb: 0.5 }}
                    >
                      경제 효과:
                    </Typography>
                    {economicHistory.salaryMultiplier && (
                      <Typography variant="caption" sx={{ display: "block" }}>
                        월급:{" "}
                        {((economicHistory.salaryMultiplier - 1) * 100 > 0
                          ? "+"
                          : "") +
                          (
                            (economicHistory.salaryMultiplier - 1) *
                            100
                          ).toFixed(0)}
                        %
                      </Typography>
                    )}
                    {economicHistory.propertyPriceMultiplier && (
                      <Typography variant="caption" sx={{ display: "block" }}>
                        부동산:{" "}
                        {((economicHistory.propertyPriceMultiplier - 1) * 100 >
                        0
                          ? "+"
                          : "") +
                          (
                            (economicHistory.propertyPriceMultiplier - 1) *
                            100
                          ).toFixed(0)}
                        %
                      </Typography>
                    )}
                    {economicHistory.buildingCostMultiplier && (
                      <Typography variant="caption" sx={{ display: "block" }}>
                        건설비용:{" "}
                        {((economicHistory.buildingCostMultiplier - 1) * 100 > 0
                          ? "+"
                          : "") +
                          (
                            (economicHistory.buildingCostMultiplier - 1) *
                            100
                          ).toFixed(0)}
                        %
                      </Typography>
                    )}
                  </Box>
                )}
              </Box>
            }
            placement="bottom"
            arrow
            componentsProps={{
              tooltip: {
                className: styles.tooltipContainer,
                sx: { fontFamily: "Galmuri14" },
              },
            }}
          >
            <Typography
              variant="body2"
              className={`${styles.economicText} ${
                economicHistory.isBoom ? styles.boomText : styles.bustText
              }`}
              sx={{ fontFamily: "Galmuri14" }}
            >
              📈 {economicHistory.fullName}
            </Typography>
          </Tooltip>
        )}
      </Box>

      {/* Player Cards */}
      {players.map((player, index) => {
        const isMyPlayer = player.id === userInfo?.userId;
        const totalAssets = calculateTotalAssets(player, board);
        const characterColors = {
          p1: "#4A90E2",
          p2: "#E74C3C",
          p3: "#F39C12",
          p4: "#9B59B6",
        };

        const getCornerPosition = (playerIndex: number) => {
          const positions = [
            { top: 20, left: 20 },
            { top: 20, right: 20 },
            { bottom: 120, right: 20 },
            { bottom: 120, left: 20 },
          ];
          return positions[playerIndex] || positions[0];
        };

        const position = getCornerPosition(index);

        return (
          <Card
            key={player.id}
            className={styles.playerCard}
            sx={{
              position: "absolute",
              ...position,
              bgcolor: `rgba(0,0,0,${player.money < 0 ? 0.4 : 0.8})`,
              border: `3px solid ${
                characterColors[player.character] || "white"
              }`,
              boxShadow:
                index === currentPlayerIndex && !isGameOver
                  ? "0 0 15px rgba(255, 215, 0, 0.6)"
                  : "0 4px 8px rgba(0,0,0,0.3)",
            }}
          >
            <CardContent className={styles.playerCardContent}>
              <Box className={styles.playerInfo}>
                <img
                  src={characterImages[player.character]}
                  alt={`${player.name} 아이콘`}
                  className={styles.playerIcon}
                  style={{ width: '30px', height: '30px' }} 
                />

                <Typography
                  variant="subtitle1"
                  component="div"
                  fontWeight="bold"
                  className={styles.playerName}
                  sx={{ color: "white", fontFamily: "Galmuri14" }}
                >
                  {player.name} {isMyPlayer ? "(나)" : ""}
                  {player.money < 0 && (
                    <span className={styles.bankruptText}> (파산)</span>
                  )}
                  {player.isInJail && (
                    <span className={styles.jailText}> 🔒</span>
                  )}
                </Typography>
              </Box>
              <Typography
                variant="body2"
                className={styles.playerStats}
                sx={{ color: "white", fontFamily: "Galmuri14" }}
              >
                💰 {player.money.toLocaleString()}원
              </Typography>
              <Typography
                variant="body2"
                className={styles.playerStats}
                sx={{ color: "white", fontFamily: "Galmuri14" }}
              >
                📊 총 {totalAssets.toLocaleString()}원
              </Typography>
              <Typography
                variant="body2"
                className={styles.playerStats}
                sx={{ color: "white", fontFamily: "Galmuri14" }}
              >
                🏘️ {player.properties.length}개 도시
              </Typography>
              {index === currentPlayerIndex && !isGameOver && (
                <Typography
                  variant="caption"
                  className={styles.currentTurnLabel}
                >
                  ⭐ 현재 턴
                </Typography>
              )}
            </CardContent>
          </Card>
        );
      })}

      <Box className={styles.bottomControls}>
        <Button
          variant="contained"
          size="large"
          onClick={handleDiceClick}
          disabled={gamePhase !== "WAITING_FOR_ROLL" || !isMyTurn}
          className={styles.mainButton}
          sx={{ fontFamily: "Galmuri14" }}
        >
          {currentPlayer?.isInJail ? "감옥..." : "주사위 굴리기"}
        </Button>

        {isMyTurn && gamePhase === "TILE_ACTION" && modal.type === "NONE" && (
          <Button
            variant="contained"
            color="primary"
            size="large"
            onClick={endTurn}
            className={styles.mainButton}
            sx={{ fontFamily: "Galmuri14" }}
          >
            턴 종료
          </Button>
        )}
      </Box>

      {gamePhase === "WORLD_TRAVEL_MOVE" && (
        <Box
          className={styles.worldTravelOverlay}
          sx={{
            bgcolor: "rgba(0, 20, 40, 0.95)",
            border: "2px solid #00ffff",
            boxShadow: "0 0 20px rgba(0, 255, 255, 0.3)",
          }}
        >
          <Typography
            variant="h4"
            className={styles.worldTravelTitle}
            sx={{
              color: "#00ffff",
              textShadow: "0 0 10px rgba(0, 255, 255, 0.8)",
              fontWeight: "bold",
            }}
          >
            🌍 세계여행
          </Typography>
          <Typography variant="h6" className={styles.worldTravelText}>
            원하는 목적지를 보드에서 직접 클릭하세요!
            <br />
            <span
              className={styles.worldTravelHighlight}
              style={{ color: "#00ffff" }}
            >
              ✨ 반짝이는 타일들이 클릭 가능한 곳입니다
            </span>
          </Typography>
          <Button
            variant="outlined"
            onClick={cancelWorldTravel}
            sx={{
              color: "#ff6b6b",
              borderColor: "#ff6b6b",
              "&:hover": {
                borderColor: "#ff5252",
                bgcolor: "rgba(255, 107, 107, 0.1)",
              },
            }}
          >
            취소
          </Button>
        </Box>
      )}

      <Modal
        open={modal.type !== "NONE" || shouldShowGameOver}
        sx={{ pointerEvents: "all" }}
      >
        <Box className={styles.modalStyle} sx={{ fontFamily: "Galmuri14" }}>
          {modal.type === "BUY_PROPERTY" && (
            <BuyPropertyModalContent
              modal={modal}
              buyPropertyWithItems={buyPropertyWithItems}
              endTurn={endTurn}
              currentPlayer={currentPlayer}
              applyEconomicMultiplier={applyEconomicMultiplier}
            />
          )}
          {modal.type === "BUY_SPECIAL_LAND" && (
            <BuySpecialLandModalContent
              modal={modal}
              buySpecialLand={buySpecialLand}
              endTurn={endTurn}
              currentPlayer={currentPlayer}
            />
          )}
          {modal.type === "ACQUIRE_PROPERTY" && (
            <AcquirePropertyModalContent
              modal={modal}
              acquireProperty={acquireProperty}
              payToll={payToll}
              currentPlayer={currentPlayer}
              endTurn={endTurn}
            />
          )}
          {modal.type === "CHANCE_CARD" && (
            <ChanceCardModalContent modal={modal} />
          )}
          {modal.type === "INFO" && (
            <InfoModalContent modal={modal} endTurn={endTurn} />
          )}
          {modal.type === "JAIL" && (
            <JailModalContent
              payBail={payBail}
              handleJail={handleJail}
              BAIL_AMOUNT={BAIL_AMOUNT}
              currentPlayer={currentPlayer}
            />
          )}
          {modal.type === "JAIL_ESCAPE" && (
            <JailEscapeModalContent modal={modal} />
          )}
          {modal.type === "EXPO" && (
            <ExpoModalContent
              modal={modal}
              selectExpoProperty={selectExpoProperty}
            />
          )}
          {modal.type === "MANAGE_PROPERTY" && (
            <ManagePropertyModalContent
              modal={modal}
              endTurn={endTurn}
              buyPropertyWithItems={buyPropertyWithItems}
              currentPlayer={currentPlayer}
            />
          )}
          {modal.type === "NTS" && <NtsModalContent modal={modal} />}
          {shouldShowGameOver && (
            <GameOverModalContent
              winner={winner}
              handleGoToLobby={handleGoToLobby}
              players={players}
              board={board}
              shouldShowGameOverByTurns={shouldShowGameOverByTurns}
              currentUserId={userInfo?.userId}
            />
          )}
        </Box>
      </Modal>

      {/* 토스트 메시지 컨테이너 */}
      <ToastContainer />
    </Box>
  );
}
